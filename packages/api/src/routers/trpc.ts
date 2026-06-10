import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Database } from "@glassbox/database";
import type Redis from "ioredis";
import { enforceRateLimit } from "../middleware/rate-limit";
import { apiKeys } from "@glassbox/database/schema";
import { eq, and, isNull } from "drizzle-orm";

/**
 * Context type — injected by the web app's tRPC init.
 * The `user` field is null for public procedures, populated for protected ones.
 * The `authHeader` is the raw Authorization header, used by apiKeyProcedure.
 */
export interface Context {
  db: Database;
  user: { id: string; email: string; name: string } | null;
  redis?: Redis;
  traceId?: string;
  authHeader?: string | null;
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

/** Procedure that requires authentication */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to access this resource",
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

/** Procedure that requires authentication and enforces rate limiting (100 req/min) */
export const rateLimitedProcedure = protectedProcedure.use(
  async ({ ctx, next }) => {
    if (ctx.redis) {
      await enforceRateLimit(ctx.redis, `user:${ctx.user.id}`, {
        limit: 100,
        windowSeconds: 60,
      });
    }
    return next({ ctx });
  }
);

/** Hash a raw API key to match against stored hashes */
export async function hashApiKey(raw: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(raw);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Validate a Bearer API key against the database.
 * Returns the key record (id, projectId, userId) on success, null otherwise.
 * Does NOT enforce rate limits — that stays inside apiKeyProcedure.
 */
export async function validateApiKey(
  db: Database,
  authHeader: string | null | undefined
): Promise<{ id: string; projectId: string; userId: string } | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const keyHash = await hashApiKey(authHeader.slice(7));
  const result = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, keyHash), isNull(apiKeys.revokedAt)))
    .limit(1);
  const key = result[0];
  if (!key) return null;
  if (key.expiresAt && key.expiresAt < new Date()) return null;
  return { id: key.id, projectId: key.projectId, userId: key.userId };
}

/**
 * Procedure that authenticates via API key in Authorization header.
 * Used for public-facing ingestion endpoints (SDK → server).
 * Rate-limited at 1000 req/min per API key.
 */
export const apiKeyProcedure = t.procedure.use(async ({ ctx, next }) => {
  const header = ctx.authHeader;
  if (!header || !header.startsWith("Bearer ")) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Missing or invalid Authorization header. Use: Bearer <api_key>",
    });
  }

  const rawKey = header.slice(7);
  const keyHash = await hashApiKey(rawKey);

  const result = await ctx.db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, keyHash), isNull(apiKeys.revokedAt)))
    .limit(1);

  const key = result[0];
  if (!key) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Invalid or revoked API key",
    });
  }

  if (key.expiresAt && key.expiresAt < new Date()) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "API key has expired",
    });
  }

  // Rate limit: 1000 req/min per API key
  if (ctx.redis) {
    await enforceRateLimit(ctx.redis, `apikey:${key.id}`, { limit: 1000, windowSeconds: 60 });
  } else if (process.env.NODE_ENV === "production") {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Rate limiter unavailable" });
  }

  // Update last used timestamp (fire-and-forget)
  void ctx.db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, key.id));

  return next({
    ctx: {
      ...ctx,
      apiKey: key,
      projectId: key.projectId,
      userId: key.userId,
    },
  });
});
