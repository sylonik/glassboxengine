import { eq } from "drizzle-orm";
import { db } from "@glassbox/database/client";
import { auditLogs, personas } from "@glassbox/database/schema";
import { runArchitectAgent, type ArchitectResult } from "./architect";
import { runReasonerAgent } from "./reasoner";
import type { SliderConfig } from "@glassbox/database";
import {
  createPolicySpec,
  type PolicySpec,
  type ReasoningTrace,
  type ReasoningTraceStep,
  type RecommendationResponse,
} from "./contracts";

export interface CoordinatorResult {
  feed: ArchitectResult;
  reasoningLabels: Awaited<ReturnType<typeof runReasonerAgent>>;
  traceId: string;
  policy: PolicySpec;
  trace: ReasoningTrace;
  recommendation: RecommendationResponse;
}

/**
 * Coordinator Agent: Orchestrates the full alignment loop.
 * 1. Receives slider update
 * 2. Delegates to Architect for pgvector search
 * 3. Delegates to Reasoner for Glass Box labels
 * 4. Logs everything to audit_logs with trace correlation
 *
 * When personaId is provided, the persona's preferenceVector is used as the
 * query embedding, enabling cold-start "pre-warm" recommendations.
 */
export async function runCoordinator(
  sliders: SliderConfig,
  userId: string,
  queryText: string = "general product recommendations",
  projectId?: string,
  personaId?: string,
  options?: {
    category?: string;
    limit?: number;
    endUserId?: string;
    policy?: PolicySpec;
  }
): Promise<CoordinatorResult> {
  const traceId = `trace_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const policy =
    options?.policy ??
    createPolicySpec({
      sliders,
      author: userId,
      category: options?.category,
      limit: options?.limit,
    });

  // Resolve persona's preference vector if provided
  let precomputedEmbedding: number[] | undefined;
  if (personaId) {
    const [persona] = await db
      .select({ preferenceVector: personas.preferenceVector })
      .from(personas)
      .where(eq(personas.id, personaId))
      .limit(1);

    if (persona?.preferenceVector) {
      precomputedEmbedding = persona.preferenceVector.map(Number);
    }
  }

  // Log: Coordinator started
  await db.insert(auditLogs).values({
    userId,
    projectId,
    action: "coordinator.start",
    agentName: "Coordinator",
    reasoning: `Alignment loop triggered with policy ${policy.version} using sliders relevance=${sliders.relevance}, diversity=${sliders.diversity}, novelty=${sliders.novelty}, popularity=${sliders.popularity}${personaId ? ` (persona pre-warm: ${personaId})` : ""}`,
    traceId,
    inputContext: {
      queryText,
      endUserId: options?.endUserId ?? userId,
    },
    metadata: { sliders, policy, ...(personaId && { personaId }) },
  });

  // 1. Run Architect Agent (with persona vector if available)
  const feed = await runArchitectAgent(
    queryText,
    sliders,
    userId,
    projectId,
    precomputedEmbedding,
    {
      category: options?.category,
      limit: options?.limit,
      policy,
    }
  );

  await db.insert(auditLogs).values({
    userId,
    projectId,
    action: "architect.search",
    agentName: "Architect",
    reasoning: feed.searchExplanation,
    traceId,
    metadata: {
      resultCount: feed.rankedFeed.length,
      queryParams: feed.queryParams,
      policyVersion: policy.version,
      constraints: policy.constraints,
      ...(precomputedEmbedding && { source: "persona_preference_vector" }),
    },
  });

  // 2. Run Reasoner Agent for Glass Box labels
  const reasoningLabels = await runReasonerAgent(
    feed.rankedFeed,
    feed.searchExplanation
  );

  await db.insert(auditLogs).values({
    userId,
    projectId,
    action: "reasoner.label",
    agentName: "Reasoner",
    reasoning: `Generated ${reasoningLabels.length} Glass Box labels`,
    traceId,
    metadata: {
      labelCount: reasoningLabels.length,
      policyVersion: policy.version,
    },
  });

  const itemSteps: ReasoningTraceStep[] = feed.rankedFeed.map((item, index) => ({
    agent: "Reasoner",
    action: "recommendation.item",
    reasoning:
      reasoningLabels.find((label) => label.itemId === item.itemId)?.detailedReasoning ??
      item.reasoning,
    metadata: {
      productId: item.itemId,
      rank: index + 1,
      score: item.score,
      scoreBreakdown: item.scoreBreakdown,
      matchedSignals: item.matchedSignals,
    },
  }));

  if (itemSteps.length > 0) {
    await db.insert(auditLogs).values(
      itemSteps.map((step, index) => ({
        userId,
        projectId,
        action: step.action,
        agentName: step.agent,
        reasoning: step.reasoning,
        traceId,
        confidenceScore: feed.rankedFeed[index]?.confidenceScore ?? null,
        metadata: step.metadata ?? {},
      }))
    );
  }

  const topFactors = Array.from(
    new Set(
      feed.rankedFeed
        .flatMap((item) => item.matchedSignals)
        .filter(Boolean)
    )
  ).slice(0, 4);

  const steps: ReasoningTraceStep[] = [
    {
      agent: "Coordinator",
      action: "coordinator.start",
      reasoning: `Policy ${policy.version} started for "${queryText}".`,
      metadata: {
        endUserId: options?.endUserId ?? userId,
      },
    },
    {
      agent: "Architect",
      action: "architect.search",
      reasoning: feed.searchExplanation,
      metadata: {
        resultCount: feed.rankedFeed.length,
        constraints: policy.constraints,
      },
    },
    {
      agent: "Reasoner",
      action: "reasoner.label",
      reasoning: `Generated faithful labels from score breakdowns for ${reasoningLabels.length} items.`,
      metadata: {
        topFactors,
      },
    },
    ...itemSteps,
  ];

  const summary =
    feed.rankedFeed.length > 0
      ? `Returned ${feed.rankedFeed.length} ranked items under policy ${policy.version}. Top signals: ${topFactors.join(", ") || "composite ranking"}.`
      : `No ranked items were returned under policy ${policy.version}.`;

  const trace: ReasoningTrace = {
    traceId,
    policyVersion: policy.version,
    appliedConstraints: policy.constraints.map((constraint) => constraint.reason),
    topFactors,
    steps,
    summary,
  };

  const recommendation: RecommendationResponse = {
    traceId,
    policy,
    queryText,
    searchExplanation: feed.searchExplanation,
    summary,
    items: feed.rankedFeed,
    trace,
  };

  await db.insert(auditLogs).values({
    userId,
    projectId,
    action: "recommendation.complete",
    agentName: "Coordinator",
    reasoning: summary,
    traceId,
    metadata: {
      itemCount: feed.rankedFeed.length,
      policyVersion: policy.version,
      topFactors,
    },
  });

  return { feed, reasoningLabels, traceId, policy, trace, recommendation };
}
