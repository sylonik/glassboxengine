import { z } from "zod";
import { eq, desc, and, isNull } from "drizzle-orm";
import { createLogger } from "@glassbox/telemetry";
import { createTRPCRouter, protectedProcedure } from "./trpc";
import { intentProfiles, personas } from "@glassbox/database/schema";
import { ensureProject, resolveProject } from "../project_utils";

const logger = createLogger("api:alignment");

const sliderSchema = z.object({
  relevance: z.number().min(0).max(1),
  diversity: z.number().min(0).max(1),
  novelty: z.number().min(0).max(1),
  popularity: z.number().min(0).max(1),
});

export const alignmentRouter = createTRPCRouter({
  /** Get the active intent profile for the current user */
  getActive: protectedProcedure
    .input(z.object({ projectId: z.string().uuid().optional() }).optional())
    .query(async ({ ctx, input }) => {
    const project = await resolveProject(ctx, input?.projectId);
    if (!project) return null;
    const result = await ctx.db
      .select()
      .from(intentProfiles)
      .where(
        and(
          eq(intentProfiles.userId, ctx.user.id),
          eq(intentProfiles.projectId, project.id),
          eq(intentProfiles.isActive, true)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }),

  /** List all intent profiles */
  list: protectedProcedure
    .input(z.object({ projectId: z.string().uuid().optional() }).optional())
    .query(async ({ ctx, input }) => {
    const project = await resolveProject(ctx, input?.projectId);
    if (!project) return [];
    return ctx.db
      .select()
      .from(intentProfiles)
      .where(
        and(
          eq(intentProfiles.userId, ctx.user.id),
          eq(intentProfiles.projectId, project.id)
        )
      )
      .orderBy(desc(intentProfiles.updatedAt));
  }),

  /** Create a new intent profile */
  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid().optional(),
        name: z.string().min(1),
        sliders: sliderSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ensureProject(ctx, input.projectId);
      // Deactivate all existing profiles
      await ctx.db
        .update(intentProfiles)
        .set({ isActive: false })
        .where(
          and(
            eq(intentProfiles.userId, ctx.user.id),
            eq(intentProfiles.projectId, project.id)
          )
        );

      const result = await ctx.db
        .insert(intentProfiles)
        .values({
          userId: ctx.user.id,
          projectId: project.id,
          name: input.name,
          sliders: input.sliders,
          isActive: true,
        })
        .returning();

      return result[0];
    }),

  /** Update slider values — triggers agent re-ranking */
  updateSliders: protectedProcedure
    .input(
      z.object({
        profileId: z.string().uuid(),
        sliders: sliderSchema,
        queryText: z.string().optional(),
        personaId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db
        .update(intentProfiles)
        .set({
          sliders: input.sliders,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(intentProfiles.id, input.profileId),
            eq(intentProfiles.userId, ctx.user.id)
          )
        )
        .returning();

      if (result.length === 0) {
        throw new Error("Profile not found");
      }

      // Resolve persona name for the "Personalized for: <persona>" badge.
      // The Coordinator independently loads the persona's preferenceVector by id;
      // here we only need the display name for the response.
      let persona: { id: string; name: string } | null = null;
      if (input.personaId) {
        const [match] = await ctx.db
          .select({ id: personas.id, name: personas.name })
          .from(personas)
          .where(
            and(
              eq(personas.id, input.personaId),
              eq(personas.userId, ctx.user.id)
            )
          )
          .limit(1);
        persona = match ?? null;
      }

      try {
        // Trigger Coordinator Agent for re-ranking.
        // personaId (5th positional arg) makes the Coordinator bias ranking by
        // the persona's 768-dim preferenceVector for cold-start personalization.
        const { runCoordinator } = await import("@glassbox/agents");
        const coordinatorResult = await runCoordinator(
          input.sliders,
          ctx.user.id,
          input.queryText || "general product recommendations",
          result[0]!.projectId ?? undefined,
          input.personaId
        );

        return {
          profile: result[0],
          policy: coordinatorResult.policy,
          recommendation: coordinatorResult.recommendation,
          trace: coordinatorResult.trace,
          feed: coordinatorResult.feed.rankedFeed,
          reasoning: coordinatorResult.reasoningLabels,
          traceId: coordinatorResult.traceId,
          searchExplanation: coordinatorResult.feed.searchExplanation,
          summary: coordinatorResult.recommendation.summary,
          persona,
          pipelineError: null,
        };
      } catch (error) {
        logger.error({ err: error }, "Coordinator failed during slider update");

        return {
          profile: result[0],
          policy: null,
          recommendation: null,
          trace: null,
          feed: [],
          reasoning: [],
          traceId: null,
          searchExplanation:
            "Slider profile saved, but the alignment pipeline could not complete.",
          summary: null,
          persona,
          pipelineError: {
            message:
              error instanceof Error
                ? error.message
                : "Alignment pipeline failed.",
          },
        };
      }
    }),

  /** Activate a specific profile */
  activate: protectedProcedure
    .input(z.object({ profileId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const profile = await ctx.db
        .select()
        .from(intentProfiles)
        .where(
          and(
            eq(intentProfiles.id, input.profileId),
            eq(intentProfiles.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!profile[0]) {
        throw new Error("Profile not found");
      }

      await ctx.db
        .update(intentProfiles)
        .set({ isActive: false })
        .where(
          and(
            eq(intentProfiles.userId, ctx.user.id),
            profile[0].projectId
              ? eq(intentProfiles.projectId, profile[0].projectId)
              : isNull(intentProfiles.projectId)
          )
        );

      const result = await ctx.db
        .update(intentProfiles)
        .set({ isActive: true })
        .where(
          and(
            eq(intentProfiles.id, input.profileId),
            eq(intentProfiles.userId, ctx.user.id)
          )
        )
        .returning();

      return result[0];
    }),
});
