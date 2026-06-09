import { z } from "zod";
import { and, eq, isNull, desc } from "drizzle-orm";
import { createHash, randomBytes } from "crypto";
import { apiKeys } from "@glassbox/database/schema";
import { ensureProject, resolveProject } from "../project_utils";
import { createTRPCRouter, protectedProcedure, rateLimitedProcedure } from "./trpc";

function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const raw = `gb_live_${randomBytes(24).toString("base64url")}`;
  const hash = createHash("sha256").update(raw).digest("hex");
  const prefix = raw.slice(0, 16);
  return { raw, hash, prefix };
}

export const deployRouter = createTRPCRouter({
  /** List all API keys for the active project (never returns the raw key) */
  listKeys: protectedProcedure
    .input(z.object({ projectId: z.string().uuid().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const project = await resolveProject(ctx, input?.projectId);
      if (!project) return [];

      return ctx.db
        .select({
          id: apiKeys.id,
          name: apiKeys.name,
          keyPrefix: apiKeys.keyPrefix,
          lastUsedAt: apiKeys.lastUsedAt,
          expiresAt: apiKeys.expiresAt,
          revokedAt: apiKeys.revokedAt,
          createdAt: apiKeys.createdAt,
        })
        .from(apiKeys)
        .where(
          and(
            eq(apiKeys.userId, ctx.user.id),
            eq(apiKeys.projectId, project.id)
          )
        )
        .orderBy(desc(apiKeys.createdAt));
    }),

  /** Generate a new API key — returns the raw key only once */
  generateKey: rateLimitedProcedure
    .input(
      z.object({
        projectId: z.string().uuid().optional(),
        name: z.string().min(1).max(100),
        expiresInDays: z.number().int().min(1).max(365).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ensureProject(ctx, input.projectId);
      const { raw, hash, prefix } = generateApiKey();

      const expiresAt = input.expiresInDays
        ? new Date(Date.now() + input.expiresInDays * 86_400_000)
        : null;

      const result = await ctx.db
        .insert(apiKeys)
        .values({
          userId: ctx.user.id,
          projectId: project.id,
          name: input.name,
          keyHash: hash,
          keyPrefix: prefix,
          expiresAt,
        })
        .returning();

      return {
        id: result[0]!.id,
        name: result[0]!.name,
        keyPrefix: prefix,
        /** The full key — shown only once */
        key: raw,
        expiresAt: result[0]!.expiresAt,
        createdAt: result[0]!.createdAt,
      };
    }),

  /** Revoke an API key */
  revokeKey: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db
        .update(apiKeys)
        .set({ revokedAt: new Date() })
        .where(
          and(eq(apiKeys.id, input.id), eq(apiKeys.userId, ctx.user.id))
        )
        .returning();

      if (!result[0]) {
        throw new Error("API key not found");
      }
      return { revoked: true };
    }),

  /** Delete an API key permanently */
  deleteKey: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(apiKeys)
        .where(
          and(eq(apiKeys.id, input.id), eq(apiKeys.userId, ctx.user.id))
        );
      return { deleted: true };
    }),

  /** Get deploy readiness status */
  getStatus: protectedProcedure
    .input(z.object({ projectId: z.string().uuid().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const project = await resolveProject(ctx, input?.projectId);
      if (!project) {
        return { ready: false, hasKeys: false, activeKeys: 0 };
      }

      const keys = await ctx.db
        .select({ id: apiKeys.id })
        .from(apiKeys)
        .where(
          and(
            eq(apiKeys.userId, ctx.user.id),
            eq(apiKeys.projectId, project.id),
            isNull(apiKeys.revokedAt)
          )
        );

      return {
        ready: keys.length > 0,
        hasKeys: keys.length > 0,
        activeKeys: keys.length,
      };
    }),
});
