import type { SliderConfig } from "@glassbox/database";

export interface PolicyConstraint {
  type: "category_filter" | "candidate_limit";
  value: string | number;
  reason: string;
}

export interface PolicySpec {
  version: string;
  sliders: SliderConfig;
  constraints: PolicyConstraint[];
  author: string;
  createdAt: string;
}

export interface RecommendationRequest {
  projectId?: string;
  endUserId: string;
  queryText: string;
  limit?: number;
  category?: string;
  policyOverride?: Partial<SliderConfig>;
}

export interface ScoreContribution {
  name: string;
  weight: number;
  rawValue: number;
  weightedValue: number;
  contribution: string;
}

export interface RankedRecommendationItem {
  id: string;
  itemId: string;
  /** The integrator's own product id (catalog external_id), so feed items can
   * be mapped back onto their catalog without knowing GlassBox UUIDs. */
  externalId: string | null;
  name: string;
  description: string | null;
  category: string | null;
  similarity: number;
  score: number;
  confidenceScore: number;
  scoreBreakdown: ScoreContribution[];
  matchedSignals: string[];
  reasoning: string;
}

export interface ReasoningLabel {
  itemId: string;
  shortLabel: string;
  detailedReasoning: string;
  factors: Array<{
    name: string;
    weight: number;
    contribution: string;
  }>;
}

export interface ReasoningTraceStep {
  agent: "Coordinator" | "Architect" | "Reasoner";
  action: string;
  reasoning: string;
  metadata?: Record<string, unknown>;
}

export interface ReasoningTrace {
  traceId: string;
  policyVersion: string;
  appliedConstraints: string[];
  topFactors: string[];
  steps: ReasoningTraceStep[];
  summary: string;
}

export interface RecommendationResponse {
  traceId: string;
  policy: PolicySpec;
  queryText: string;
  searchExplanation: string;
  summary: string;
  items: RankedRecommendationItem[];
  trace: ReasoningTrace;
}

export function normalizeSliderConfig(
  sliders: Partial<SliderConfig> | SliderConfig
): SliderConfig {
  return {
    relevance: clampScore(sliders.relevance ?? 0.5),
    diversity: clampScore(sliders.diversity ?? 0.5),
    novelty: clampScore(sliders.novelty ?? 0.5),
    popularity: clampScore(sliders.popularity ?? 0.5),
  };
}

export function createPolicySpec(params: {
  sliders: Partial<SliderConfig> | SliderConfig;
  author: string;
  category?: string;
  limit?: number;
  createdAt?: Date;
}): PolicySpec {
  const createdAt = (params.createdAt ?? new Date()).toISOString();
  const sliders = normalizeSliderConfig(params.sliders);
  const constraints: PolicyConstraint[] = [];

  if (params.category) {
    constraints.push({
      type: "category_filter",
      value: params.category,
      reason: `Limit candidates to the ${params.category} category.`,
    });
  }

  if (params.limit) {
    constraints.push({
      type: "candidate_limit",
      value: params.limit,
      reason: `Return at most ${params.limit} ranked items.`,
    });
  }

  return {
    version: `policy_${createdAt.replaceAll(/[:.]/g, "-")}`,
    sliders,
    constraints,
    author: params.author,
    createdAt,
  };
}

export function clampScore(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}
