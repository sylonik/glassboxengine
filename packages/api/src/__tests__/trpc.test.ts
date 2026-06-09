import { describe, it, expect } from "vitest";
import { protectedProcedure, publicProcedure, createTRPCRouter } from "../routers/trpc";
import { TRPCError } from "@trpc/server";

describe("protectedProcedure", () => {
  const testRouter = createTRPCRouter({
    secret: protectedProcedure.query(({ ctx }) => {
      return { userId: ctx.user.id };
    }),
    open: publicProcedure.query(() => {
      return { ok: true };
    }),
  });

  it("throws UNAUTHORIZED when user is null", async () => {
    const caller = testRouter.createCaller({
      db: {} as any,
      user: null,
    });

    await expect(caller.secret()).rejects.toThrow(TRPCError);
    await expect(caller.secret()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("passes through when user is present", async () => {
    const caller = testRouter.createCaller({
      db: {} as any,
      user: { id: "user-1", email: "test@example.com", name: "Test User" },
    });

    const result = await caller.secret();
    expect(result).toEqual({ userId: "user-1" });
  });

  it("allows public procedure without auth", async () => {
    const caller = testRouter.createCaller({
      db: {} as any,
      user: null,
    });

    const result = await caller.open();
    expect(result).toEqual({ ok: true });
  });
});
