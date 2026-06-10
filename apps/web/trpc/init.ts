import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { cache } from "react";
import { headers } from "next/headers";
import { db } from "@glassbox/database/client";
import { auth } from "~/lib/auth";
import { getRedis } from "~/lib/redis";

export const createTRPCContext = cache(async () => {
  const headersList = await headers();

  // Get session from better-auth
  const session = await auth.api.getSession({
    headers: headersList,
  });

  return {
    db,
    redis: getRedis(),
    user: session?.user
      ? {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
        }
      : null,
    authHeader: headersList.get("authorization"),
  };
});

const t = initTRPC.context<Awaited<ReturnType<typeof createTRPCContext>>>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Not authenticated",
    });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});
