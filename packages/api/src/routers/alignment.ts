import { z } from "zod";
import { eq, desc, and, isNull, sql } from "drizzle-orm";
import { createLogger } from "@glassbox/telemetry";
import { createTRPCRouter, protectedProcedure } from "./trpc";
import {
  intentProfiles,
  personas,
  products,
  auditLogs,
} from "@glassbox/database/schema";
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

  /**
   * Architect Agent: convert a plain-language business goal into a proposed
   * slider configuration with rationale + tradeoffs. Runs on the Python ADK
   * Architect pipeline (Vertex AI Agent Engine) when configured, with an
   * in-process Gemini fallback. Every step is written to the Glass Box.
   */
  proposeFromGoal: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid().optional(),
        goal: z.string().min(8).max(600),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ensureProject(ctx, input.projectId);
      const traceId = `arch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      // Catalog summary grounds the proposal in what the project actually sells.
      const categoryRows = await ctx.db
        .select({
          name: sql<string>`coalesce(${products.category}, 'uncategorized')`,
          count: sql<number>`count(*)::int`,
        })
        .from(products)
        .where(
          and(
            eq(products.userId, ctx.user.id),
            eq(products.projectId, project.id)
          )
        )
        .groupBy(sql`coalesce(${products.category}, 'uncategorized')`)
        .orderBy(desc(sql`count(*)`))
        .limit(12);
      const catalogSummary = {
        productCount: categoryRows.reduce((total, row) => total + row.count, 0),
        categories: categoryRows,
      };

      const [activeProfile] = await ctx.db
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

      await ctx.db.insert(auditLogs).values({
        userId: ctx.user.id,
        projectId: project.id,
        action: "architect.propose.start",
        agentName: "Architect",
        reasoning: `Translating business goal into a slider configuration: "${input.goal}"`,
        traceId,
        metadata: { goal: input.goal, catalogSummary },
      });

      try {
        const { proposeAlignmentFromGoal } = await import("@glassbox/agents");
        const rawSliders = activeProfile?.sliders as
          | Record<string, unknown>
          | undefined;
        const currentSliders =
          rawSliders &&
          typeof rawSliders.relevance === "number" &&
          typeof rawSliders.diversity === "number" &&
          typeof rawSliders.novelty === "number" &&
          typeof rawSliders.popularity === "number"
            ? {
                relevance: rawSliders.relevance,
                diversity: rawSliders.diversity,
                novelty: rawSliders.novelty,
                popularity: rawSliders.popularity,
              }
            : undefined;
        const proposal = await proposeAlignmentFromGoal(input.goal, {
          currentSliders,
          catalogSummary,
        });

        await ctx.db.insert(auditLogs).values({
          userId: ctx.user.id,
          projectId: project.id,
          action: "architect.propose.complete",
          agentName: "Architect",
          reasoning: proposal.rationale,
          traceId,
          metadata: {
            profileName: proposal.profileName,
            sliders: proposal.sliders,
            derived: proposal.derived,
            tradeoffs: proposal.tradeoffs,
            runtime: proposal.runtime,
          },
        });

        return { ...proposal, traceId };
      } catch (error) {
        logger.error({ err: error }, "Architect proposal failed");
        await ctx.db.insert(auditLogs).values({
          userId: ctx.user.id,
          projectId: project.id,
          action: "architect.propose.error",
          agentName: "Architect",
          reasoning:
            error instanceof Error ? error.message : "Architect proposal failed",
          traceId,
        });
        throw new Error(
          "The Architect could not produce a proposal. Try rephrasing the goal."
        );
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
