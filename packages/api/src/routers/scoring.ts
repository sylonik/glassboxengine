import { z } from "zod";
import { and, eq, desc } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure, apiKeyProcedure } from "./trpc";
import { scoringFunctions, intentProfiles } from "@glassbox/database/schema";
import { ensureProject, resolveProject } from "../project_utils";

export const scoringRouter = createTRPCRouter({
  /** List scoring functions for the current user */
  list: protectedProcedure
    .input(z.object({ projectId: z.string().uuid().optional() }).optional())
    .query(async ({ ctx, input }) => {
    const project = await resolveProject(ctx, input?.projectId);
    if (!project) return [];
    return ctx.db
      .select()
      .from(scoringFunctions)
      .where(
        and(
          eq(scoringFunctions.userId, ctx.user.id),
          eq(scoringFunctions.projectId, project.id)
        )
      )
      .orderBy(desc(scoringFunctions.updatedAt));
  }),

  /** Get a single scoring function */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.db
        .select()
        .from(scoringFunctions)
        .where(
          and(
            eq(scoringFunctions.id, input.id),
            eq(scoringFunctions.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (result.length === 0) {
        throw new Error("Scoring function not found");
      }
      return result[0];
    }),

  /** Create a new scoring function */
  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid().optional(),
        name: z.string().min(1),
        description: z.string().optional(),
        code: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ensureProject(ctx, input.projectId);
      const { projectId: _projectId, ...functionInput } = input;
      const result = await ctx.db
        .insert(scoringFunctions)
        .values({
          userId: ctx.user.id,
          projectId: project.id,
          ...functionInput,
        })
        .returning();

      return result[0];
    }),

  /** Update scoring function code (draft save) */
  updateCode: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        code: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db
        .update(scoringFunctions)
        .set({
          ...(input.name ? { name: input.name } : {}),
          code: input.code,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(scoringFunctions.id, input.id),
            eq(scoringFunctions.userId, ctx.user.id)
          )
        )
        .returning();

      return result[0];
    }),

  /** Commit scoring function — triggers Mentor review */
  commit: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Get the scoring function
      const fn = await ctx.db
        .select()
        .from(scoringFunctions)
        .where(
          and(
            eq(scoringFunctions.id, input.id),
            eq(scoringFunctions.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (fn.length === 0) throw new Error("Scoring function not found");

      // Run Mentor Agent review
      const { runMentorAgent } = await import("@glassbox/agents");
      const review = await runMentorAgent(fn[0]!.code);

      if (!review.approved) {
        return {
          blocked: true,
          dialogue: review.dialogue,
          validation: review.validation,
        };
      }

      // Approved — commit the function
      const result = await ctx.db
        .update(scoringFunctions)
        .set({
          isCommitted: true,
          version: (fn[0]!.version ?? 0) + 1,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(scoringFunctions.id, input.id),
            eq(scoringFunctions.userId, ctx.user.id)
          )
        )
        .returning();

      return {
        blocked: false,
        dialogue: review.dialogue,
        function: result[0],
      };
    }),

  /**
   * API-key-authenticated scoring config retrieval for MCP / external agents.
   * Returns the committed scoring function (if any) and the active intent profile
   * sliders for the project that owns the API key.
   */
  sdkGetConfig: apiKeyProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      // Committed scoring function (most recently updated)
      const [scoringFn] = await ctx.db
        .select({
          id: scoringFunctions.id,
          name: scoringFunctions.name,
          description: scoringFunctions.description,
          code: scoringFunctions.code,
          version: scoringFunctions.version,
          isCommitted: scoringFunctions.isCommitted,
          updatedAt: scoringFunctions.updatedAt,
        })
        .from(scoringFunctions)
        .where(
          and(
            eq(scoringFunctions.userId, ctx.userId),
            eq(scoringFunctions.projectId, ctx.projectId),
            eq(scoringFunctions.isCommitted, true)
          )
        )
        .orderBy(desc(scoringFunctions.updatedAt))
        .limit(1);

      // Active intent profile (slider defaults)
      const [activeProfile] = await ctx.db
        .select({
          id: intentProfiles.id,
          name: intentProfiles.name,
          sliders: intentProfiles.sliders,
          isActive: intentProfiles.isActive,
          updatedAt: intentProfiles.updatedAt,
        })
        .from(intentProfiles)
        .where(
          and(
            eq(intentProfiles.userId, ctx.userId),
            eq(intentProfiles.projectId, ctx.projectId),
            eq(intentProfiles.isActive, true)
          )
        )
        .limit(1);

      const defaultSliders = {
        relevance: 0.5,
        diversity: 0.5,
        novelty: 0.5,
        popularity: 0.5,
      };

      return {
        projectId: ctx.projectId,
        scoringFunction: scoringFn ?? null,
        activeIntentProfile: activeProfile ?? null,
        defaultSliders: (activeProfile?.sliders as typeof defaultSliders | null) ?? defaultSliders,
      };
    }),

  /**
   * One Socratic dialogue turn after a blocked commit: the engineer answers
   * the Mentor's question and gets a response that deepens understanding
   * (never the fixed code) plus a ready-to-commit signal.
   */
  mentorReply: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        transcript: z.array(z.string().max(2000)).max(60),
        message: z.string().min(1).max(2000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const fn = await ctx.db
        .select()
        .from(scoringFunctions)
        .where(
          and(
            eq(scoringFunctions.id, input.id),
            eq(scoringFunctions.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (fn.length === 0) throw new Error("Scoring function not found");

      const { runMentorDialogue } = await import("@glassbox/agents");
      return runMentorDialogue(fn[0]!.code, input.transcript, input.message);
    }),
});
