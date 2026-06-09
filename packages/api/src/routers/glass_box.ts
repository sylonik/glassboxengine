import { z } from "zod";
import { and, eq, desc, sql } from "drizzle-orm";
import {
  createTRPCRouter,
  protectedProcedure,
  apiKeyProcedure,
} from "./trpc";
import {
  auditLogs,
  intentProfiles,
  recommendationEvents,
} from "@glassbox/database/schema";
import { createPolicySpec, normalizeSliderConfig, runCoordinator } from "@glassbox/agents";
import { resolveProject } from "../project_utils";

function buildStructuredTrace(logs: Array<{
  action: string;
  reasoning: string | null;
  agentName: string | null;
  traceId: string | null;
  metadata: Record<string, unknown> | null;
}>) {
  const traceId = logs[0]?.traceId ?? "";
  const policyVersion =
    logs.find((log) => typeof log.metadata?.policyVersion === "string")?.metadata?.policyVersion;
  const topFactors = logs.find((log) => Array.isArray(log.metadata?.topFactors))
    ?.metadata?.topFactors as string[] | undefined;
  const constraints = logs.find((log) => Array.isArray(log.metadata?.constraints))
    ?.metadata?.constraints as Array<{ reason?: string }> | undefined;

  return {
    traceId,
    policyVersion: typeof policyVersion === "string" ? policyVersion : "unknown",
    appliedConstraints:
      constraints?.map((constraint) => constraint.reason).filter(Boolean) ?? [],
    topFactors: topFactors ?? [],
    summary:
      logs.find((log) => log.action === "recommendation.complete")?.reasoning ??
      logs.at(-1)?.reasoning ??
      "No summary available.",
    steps: logs.map((log) => ({
      agent: log.agentName ?? "System",
      action: log.action,
      reasoning: log.reasoning ?? "",
      metadata: log.metadata ?? {},
    })),
  };
}

export const glassBoxRouter = createTRPCRouter({
  recommend: apiKeyProcedure
    .input(
      z.object({
        endUserId: z.string().min(1),
        queryText: z.string().min(1).default("personalized product recommendations"),
        limit: z.number().int().min(1).max(100).optional(),
        category: z.string().optional(),
        sliders: z
          .object({
            relevance: z.number().min(0).max(1).optional(),
            diversity: z.number().min(0).max(1).optional(),
            novelty: z.number().min(0).max(1).optional(),
            popularity: z.number().min(0).max(1).optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const startedAt = Date.now();
      const [activeProfile] = await ctx.db
        .select({ sliders: intentProfiles.sliders })
        .from(intentProfiles)
        .where(
          and(
            eq(intentProfiles.userId, ctx.userId),
            eq(intentProfiles.projectId, ctx.projectId),
            eq(intentProfiles.isActive, true)
          )
        )
        .limit(1);

      const sliders = normalizeSliderConfig({
        ...(activeProfile?.sliders as Record<string, number> | undefined),
        ...input.sliders,
      });
      const policy = createPolicySpec({
        sliders,
        author: ctx.userId,
        category: input.category,
        limit: input.limit,
      });

      const result = await runCoordinator(
        sliders,
        ctx.userId,
        input.queryText,
        ctx.projectId,
        undefined,
        {
          category: input.category,
          limit: input.limit,
          endUserId: input.endUserId,
          policy,
        }
      );

      const avgConfidence =
        result.recommendation.items.length > 0
          ? result.recommendation.items.reduce(
              (total, item) => total + item.confidenceScore,
              0
            ) / result.recommendation.items.length
          : 0;

      await ctx.db.insert(recommendationEvents).values({
        userId: ctx.userId,
        projectId: ctx.projectId,
        endUserId: input.endUserId,
        itemCount: result.recommendation.items.length,
        avgConfidence,
        sliders,
        category: input.category,
        latencyMs: Date.now() - startedAt,
      });

      return result.recommendation;
    }),

  /** List recent audit logs for the current user */
  recentLogs: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        action: z.string().optional(),
        agentName: z.string().optional(),
        projectId: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Scope to the active project so the dashboard's Recent Activity panel
      // never shows audit logs from the user's other projects.
      const project = await resolveProject(ctx, input.projectId);
      if (!project) return [];

      const conditions = [
        eq(auditLogs.userId, ctx.user.id),
        eq(auditLogs.projectId, project.id),
      ];

      if (input.action) {
        conditions.push(eq(auditLogs.action, input.action));
      }
      if (input.agentName) {
        conditions.push(eq(auditLogs.agentName, input.agentName));
      }

      const where = sql`${sql.join(conditions, sql` AND `)}`;

      const logs = await ctx.db
        .select()
        .from(auditLogs)
        .where(where)
        .orderBy(desc(auditLogs.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return logs;
    }),

  /** Get reasoning chain for a specific item recommendation */
  getReasoningChain: protectedProcedure
    .input(
      z.object({
        traceId: z.string(),
        projectId: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(auditLogs.userId, ctx.user.id),
        eq(auditLogs.traceId, input.traceId),
      ];

      if (input.projectId) {
        conditions.push(eq(auditLogs.projectId, input.projectId));
      }

      const chain = await ctx.db
        .select()
        .from(auditLogs)
        .where(and(...conditions))
        .orderBy(auditLogs.createdAt);

      return chain;
    }),

  sdkGetReasoningChain: apiKeyProcedure
    .input(z.object({ traceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const logs = await ctx.db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.userId, ctx.userId),
            eq(auditLogs.projectId, ctx.projectId),
            eq(auditLogs.traceId, input.traceId)
          )
        )
        .orderBy(auditLogs.createdAt);

      return buildStructuredTrace(
        logs.map((log) => ({
          action: log.action,
          reasoning: log.reasoning,
          agentName: log.agentName,
          traceId: log.traceId,
          metadata: (log.metadata as Record<string, unknown> | null) ?? null,
        }))
      );
    }),

  /** Get reasoning chain for a specific item by looking up its most recent trace */
  getReasoningForItem: protectedProcedure
    .input(
      z.object({
        itemId: z.string(),
        projectId: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(auditLogs.userId, ctx.user.id),
        sql`${auditLogs.metadata}->>'productId' = ${input.itemId}`,
      ];

      if (input.projectId) {
        conditions.push(eq(auditLogs.projectId, input.projectId));
      }

      // Find the most recent log that references this item
      const [match] = await ctx.db
        .select({ traceId: auditLogs.traceId })
        .from(auditLogs)
        .where(and(...conditions))
        .orderBy(desc(auditLogs.createdAt))
        .limit(1);

      if (!match?.traceId) return [];

      // Return the full reasoning chain for that trace
      const chain = await ctx.db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.userId, ctx.user.id),
            eq(auditLogs.traceId, match.traceId)
          )
        )
        .orderBy(auditLogs.createdAt);

      return chain;
    }),

  sdkGetReasoningForItem: apiKeyProcedure
    .input(z.object({ itemId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [match] = await ctx.db
        .select({ traceId: auditLogs.traceId })
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.userId, ctx.userId),
            eq(auditLogs.projectId, ctx.projectId),
            sql`${auditLogs.metadata}->>'productId' = ${input.itemId}`
          )
        )
        .orderBy(desc(auditLogs.createdAt))
        .limit(1);

      if (!match?.traceId) {
        return {
          traceId: "",
          policyVersion: "unknown",
          appliedConstraints: [],
          topFactors: [],
          summary: "No reasoning trace found for this item.",
          steps: [],
        };
      }

      const logs = await ctx.db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.userId, ctx.userId),
            eq(auditLogs.projectId, ctx.projectId),
            eq(auditLogs.traceId, match.traceId)
          )
        )
        .orderBy(auditLogs.createdAt);

      return buildStructuredTrace(
        logs.map((log) => ({
          action: log.action,
          reasoning: log.reasoning,
          agentName: log.agentName,
          traceId: log.traceId,
          metadata: (log.metadata as Record<string, unknown> | null) ?? null,
        }))
      );
    }),

  /** Get distinct action types */
  actionTypes: protectedProcedure
    .input(z.object({ projectId: z.string().uuid().optional() }).optional())
    .query(async ({ ctx, input }) => {
    const conditions = [eq(auditLogs.userId, ctx.user.id)];
    if (input?.projectId) conditions.push(eq(auditLogs.projectId, input.projectId));

    const result = await ctx.db
      .selectDistinct({ action: auditLogs.action })
      .from(auditLogs)
      .where(and(...conditions));

    return result.map((r) => r.action);
  }),

  /** Get distinct agent names */
  agentNames: protectedProcedure
    .input(z.object({ projectId: z.string().uuid().optional() }).optional())
    .query(async ({ ctx, input }) => {
    const conditions = [eq(auditLogs.userId, ctx.user.id)];
    if (input?.projectId) conditions.push(eq(auditLogs.projectId, input.projectId));

    const result = await ctx.db
      .selectDistinct({ agentName: auditLogs.agentName })
      .from(auditLogs)
      .where(and(...conditions));

    return result
      .map((r) => r.agentName)
      .filter(Boolean) as string[];
  }),
});
