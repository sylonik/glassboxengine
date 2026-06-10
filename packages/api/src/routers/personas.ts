import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  personas,
  syntheticInteractions,
  products,
  auditLogs,
} from "@glassbox/database/schema";
import type { PersonaBehaviorConfig } from "@glassbox/database";
import {
  runPersonaSimulatorAgent,
  generateBehaviorFromDescription,
  buildPersonasFromEvents,
} from "@glassbox/agents";
import { getClickHouseClient } from "@glassbox/event-pipeline";
import { ensureProject, resolveProject } from "../project_utils";
import { createTRPCRouter, protectedProcedure } from "./trpc";

const sliderSchema = z.object({
  relevance: z.number().min(0).max(1),
  diversity: z.number().min(0).max(1),
  novelty: z.number().min(0).max(1),
  popularity: z.number().min(0).max(1),
});

export const personasRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ projectId: z.string().uuid().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const project = await resolveProject(ctx, input?.projectId);
      if (!project) return [];

      return ctx.db
        .select()
        .from(personas)
        .where(
          and(
            eq(personas.userId, ctx.user.id),
            eq(personas.projectId, project.id)
          )
        )
        .orderBy(desc(personas.updatedAt));
    }),

  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid().optional(),
        name: z.string().min(1),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ensureProject(ctx, input.projectId);

      // If description is provided, use AI to generate a realistic behaviorConfig
      const defaultConfig: PersonaBehaviorConfig = {
        browsingPatterns: ["discovery", "comparison"],
        priceRange: { min: 0, max: 500 },
        categoryPreferences: [],
        engagementLevel: "medium",
      };

      const behaviorConfig: PersonaBehaviorConfig = input.description?.trim()
        ? await generateBehaviorFromDescription(input.description.trim())
        : defaultConfig;

      const result = await ctx.db
        .insert(personas)
        .values({
          userId: ctx.user.id,
          projectId: project.id,
          name: input.name,
          description: input.description,
          behaviorConfig,
        })
        .returning();

      return result[0];
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        behaviorConfig: z
          .object({
            browsingPatterns: z.array(z.string()),
            priceRange: z.object({ min: z.number(), max: z.number() }),
            categoryPreferences: z.array(z.string()),
            engagementLevel: z.enum(["low", "medium", "high"]),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db
        .update(personas)
        .set({
          ...(input.name !== undefined && { name: input.name }),
          ...(input.description !== undefined && {
            description: input.description,
          }),
          ...(input.behaviorConfig !== undefined && {
            behaviorConfig: input.behaviorConfig,
          }),
          updatedAt: new Date(),
        })
        .where(
          and(eq(personas.id, input.id), eq(personas.userId, ctx.user.id))
        )
        .returning();

      return result[0];
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Synthetic interactions cascade-delete via FK
      await ctx.db
        .delete(personas)
        .where(
          and(eq(personas.id, input.id), eq(personas.userId, ctx.user.id))
        );

      return { deleted: true };
    }),

  simulate: protectedProcedure
    .input(
      z.object({
        personaId: z.string().uuid(),
        projectId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ensureProject(ctx, input.projectId);

      // Verify the persona belongs to this user + project before touching its
      // interactions. Without this check any authenticated user could wipe and
      // overwrite another tenant's persona simply by guessing its id (IDOR).
      const [persona] = await ctx.db
        .select({ id: personas.id })
        .from(personas)
        .where(
          and(
            eq(personas.id, input.personaId),
            eq(personas.userId, ctx.user.id),
            eq(personas.projectId, project.id)
          )
        )
        .limit(1);
      if (!persona) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Persona not found" });
      }

      // Make sure the catalog is embedded before simulating. importFeed embeds
      // by default, but a user can disable autoEmbed, which would otherwise dead-
      // end the simulation with a raw "generate embeddings first" error. Embed
      // on demand here so Simulate is self-healing.
      const [counts] = await ctx.db
        .select({
          total: sql<number>`count(*)`,
          embedded: sql<number>`count(*) filter (where ${products.embedding} is not null)`,
        })
        .from(products)
        .where(
          and(
            eq(products.userId, ctx.user.id),
            eq(products.projectId, project.id)
          )
        );

      const total = Number(counts?.total ?? 0);
      const embedded = Number(counts?.embedded ?? 0);
      if (total === 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Import a catalog before running a simulation.",
        });
      }
      if (embedded === 0) {
        const { runEngineerAgent } = await import("@glassbox/agents");
        await runEngineerAgent(total, ctx.user.id, project.id);
      }

      // Clear previous simulation data for this persona
      await ctx.db
        .delete(syntheticInteractions)
        .where(eq(syntheticInteractions.personaId, input.personaId));

      const result = await runPersonaSimulatorAgent(
        input.personaId,
        ctx.user.id,
        project.id
      );

      return {
        interactionCount: result.interactions.length,
        summary: result.summary,
        interactions: result.interactions,
      };
    }),

  getSimulationResults: protectedProcedure
    .input(z.object({ personaId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const interactions = await ctx.db
        .select({
          id: syntheticInteractions.id,
          productId: syntheticInteractions.productId,
          productName: products.name,
          productCategory: products.category,
          interactionType: syntheticInteractions.interactionType,
          confidence: syntheticInteractions.confidence,
          reasoning: syntheticInteractions.reasoning,
          createdAt: syntheticInteractions.createdAt,
        })
        .from(syntheticInteractions)
        .leftJoin(products, eq(syntheticInteractions.productId, products.id))
        .where(
          and(
            eq(syntheticInteractions.personaId, input.personaId),
            eq(syntheticInteractions.userId, ctx.user.id)
          )
        )
        .orderBy(desc(syntheticInteractions.createdAt));

      return interactions;
    }),

  generateBehaviorConfig: protectedProcedure
    .input(z.object({ description: z.string().min(1) }))
    .mutation(async ({ input }) => {
      return generateBehaviorFromDescription(input.description);
    }),

  /**
   * Logic Drift testing: run two slider configurations through the
   * deterministic ranking core for every simulated persona and compare how
   * each strategy lands per segment — BEFORE shipping the change. Predicted
   * engagement is grounded in each persona's synthetic interactions.
   */
  compareConfigs: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid().optional(),
        configA: sliderSchema,
        configB: sliderSchema,
        queryText: z.string().max(300).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ensureProject(ctx, input.projectId);

      const personaRows = await ctx.db
        .select({
          id: personas.id,
          name: personas.name,
          preferenceVector: personas.preferenceVector,
        })
        .from(personas)
        .where(
          and(
            eq(personas.userId, ctx.user.id),
            eq(personas.projectId, project.id),
            sql`${personas.preferenceVector} IS NOT NULL`
          )
        )
        .orderBy(desc(personas.updatedAt))
        .limit(8);

      if (personaRows.length === 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "No simulated personas yet. Run Simulate on at least one persona first — comparison needs their preference vectors.",
        });
      }

      // Affinity sets from synthetic interactions: how strongly each persona
      // engaged with each product during simulation.
      const interactionWeights: Record<string, number> = {
        purchase: 1,
        cart_add: 0.7,
        click: 0.4,
        view: 0.2,
      };
      const interactionRows = await ctx.db
        .select({
          personaId: syntheticInteractions.personaId,
          productId: syntheticInteractions.productId,
          interactionType: syntheticInteractions.interactionType,
        })
        .from(syntheticInteractions)
        .where(
          and(
            eq(syntheticInteractions.userId, ctx.user.id),
            eq(syntheticInteractions.projectId, project.id)
          )
        );
      const affinity = new Map<string, Map<string, number>>();
      for (const row of interactionRows) {
        const weight = interactionWeights[row.interactionType] ?? 0;
        const byProduct = affinity.get(row.personaId) ?? new Map<string, number>();
        byProduct.set(row.productId, Math.max(byProduct.get(row.productId) ?? 0, weight));
        affinity.set(row.personaId, byProduct);
      }

      const { runArchitectAgent, createPolicySpec } = await import(
        "@glassbox/agents"
      );
      const queryText =
        input.queryText?.trim() || "general product recommendations";
      const traceId = `cmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      const rankFor = async (
        sliders: typeof input.configA,
        preferenceVector: number[]
      ) => {
        const policy = createPolicySpec({ sliders, author: ctx.user.id });
        const result = await runArchitectAgent(
          queryText,
          sliders,
          ctx.user.id,
          project.id,
          preferenceVector,
          { limit: 10, policy }
        );
        return result.rankedFeed;
      };

      const metricsFor = (
        feed: Awaited<ReturnType<typeof rankFor>>,
        personaAffinity: Map<string, number> | undefined
      ) => {
        const items = feed.slice(0, 10);
        const engagement =
          items.length > 0
            ? items.reduce(
                (total, item) => total + (personaAffinity?.get(item.itemId) ?? 0),
                0
              ) / items.length
            : 0;
        const avgConfidence =
          items.length > 0
            ? items.reduce((total, item) => total + item.confidenceScore, 0) /
              items.length
            : 0;
        const categories = new Set(
          items.map((item) => item.category ?? "uncategorized")
        );
        return {
          predictedEngagement: Number(engagement.toFixed(3)),
          avgConfidence: Number(avgConfidence.toFixed(3)),
          categoryCoverage: categories.size,
          topItems: items.slice(0, 3).map((item) => item.name),
        };
      };

      const rows: Array<{
        personaId: string;
        personaName: string;
        a: ReturnType<typeof metricsFor>;
        b: ReturnType<typeof metricsFor>;
      }> = [];
      for (const persona of personaRows) {
        const vector = persona.preferenceVector as number[];
        const personaAffinity = affinity.get(persona.id);
        const [feedA, feedB] = await Promise.all([
          rankFor(input.configA, vector),
          rankFor(input.configB, vector),
        ]);
        rows.push({
          personaId: persona.id,
          personaName: persona.name,
          a: metricsFor(feedA, personaAffinity),
          b: metricsFor(feedB, personaAffinity),
        });
      }

      const average = (select: (row: (typeof rows)[number]) => number) =>
        Number(
          (rows.reduce((total, row) => total + select(row), 0) / rows.length).toFixed(3)
        );
      const aggregate = {
        a: {
          predictedEngagement: average((row) => row.a.predictedEngagement),
          avgConfidence: average((row) => row.a.avgConfidence),
          categoryCoverage: average((row) => row.a.categoryCoverage),
        },
        b: {
          predictedEngagement: average((row) => row.b.predictedEngagement),
          avgConfidence: average((row) => row.b.avgConfidence),
          categoryCoverage: average((row) => row.b.categoryCoverage),
        },
      };

      await ctx.db.insert(auditLogs).values({
        userId: ctx.user.id,
        projectId: project.id,
        action: "personas.compare_configs",
        agentName: "PersonaSimulator",
        reasoning: `Compared two slider configurations across ${rows.length} simulated personas: predicted engagement ${aggregate.a.predictedEngagement} (A) vs ${aggregate.b.predictedEngagement} (B).`,
        traceId,
        metadata: {
          configA: input.configA,
          configB: input.configB,
          queryText,
          aggregate,
        },
      });

      return { traceId, personas: rows, aggregate };
    }),

  buildFromEvents: protectedProcedure
    .input(
      z
        .object({
          projectId: z.string().uuid().optional(),
          lookbackDays: z.number().int().min(1).max(365).default(30),
          minEvents: z.number().int().min(1).max(100).default(3),
        })
        .optional()
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ensureProject(ctx, input?.projectId);
      return buildPersonasFromEvents({
        userId: ctx.user.id,
        projectId: project.id,
        lookbackDays: input?.lookbackDays,
        minEvents: input?.minEvents,
        clickhouse: getClickHouseClient(),
      });
    }),
});
