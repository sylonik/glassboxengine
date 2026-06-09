import type { SliderConfig } from "@glassbox/database";
import type { EvaluationDataset } from "./evaluation-datasets";
import type { EvaluationCandidate, EvaluationScenario } from "./evaluation";

export type FeedbackEvalEventType = "view" | "click" | "cart_add" | "purchase";

export interface FeedbackEvalProduct {
  id: string;
  name: string;
  category: string | null;
  createdAt: string | Date | null;
}

export interface FeedbackEvalEvent {
  endUserId: string;
  productId: string | null;
  eventType: FeedbackEvalEventType;
  createdAt: string | Date | null;
}

export interface FeedbackEvalRecommendationEvent {
  endUserId: string;
  sliders: Partial<SliderConfig> | null;
  createdAt: string | Date | null;
}

export interface FeedbackDerivedDatasetInput {
  datasetName: string;
  products: FeedbackEvalProduct[];
  feedbackEvents: FeedbackEvalEvent[];
  recommendationEvents?: FeedbackEvalRecommendationEvent[];
}

export interface FeedbackDerivedDatasetOptions {
  minRelevantEvents?: number;
  minCandidates?: number;
  maxCandidates?: number;
  maxRelevantIds?: number;
  maxScenarios?: number;
}

const EVENT_WEIGHT: Record<FeedbackEvalEventType, number> = {
  view: 0.2,
  click: 0.6,
  cart_add: 0.85,
  purchase: 1,
};

const DEFAULT_OPTIONS: Required<FeedbackDerivedDatasetOptions> = {
  minRelevantEvents: 2,
  minCandidates: 5,
  maxCandidates: 12,
  maxRelevantIds: 5,
  maxScenarios: 25,
};

export function createEvaluationDatasetFromFeedback(
  input: FeedbackDerivedDatasetInput,
  options?: FeedbackDerivedDatasetOptions
): EvaluationDataset {
  const config = {
    ...DEFAULT_OPTIONS,
    ...compactDefinedOptions(options),
  };
  const productsById = new Map(input.products.map((product) => [product.id, product]));
  const globalInteractionCounts = countGlobalInteractions(
    input.feedbackEvents,
    productsById
  );
  const categoryInteractionCounts = countCategoryInteractions(
    input.feedbackEvents,
    productsById
  );
  const latestSliderByUser = getLatestSliderByUser(input.recommendationEvents ?? []);
  const productFreshness = buildFreshnessScores(input.products);
  const candidateScenarios: EvaluationScenario[] = [];

  for (const [endUserId, events] of groupBy(input.feedbackEvents, (event) => event.endUserId)) {
    const aggregated = aggregateUserProductSignals(events, productsById);
    const relevantProducts = Array.from(aggregated.entries())
      .filter(([, signal]) => signal.weightedScore >= 0.6)
      .sort((left, right) => right[1].weightedScore - left[1].weightedScore)
      .slice(0, config.maxRelevantIds);

    if (relevantProducts.length < config.minRelevantEvents) {
      continue;
    }

    const engagedCategoryCounts = new Map<string, number>();
    for (const [productId, signal] of aggregated.entries()) {
      const product = productsById.get(productId);
      const category = normalizeCategory(product?.category);
      engagedCategoryCounts.set(
        category,
        (engagedCategoryCounts.get(category) ?? 0) + signal.count
      );
    }

    const relevantIds = relevantProducts.map(([productId]) => productId);
    const candidateIds = pickCandidateIds({
      relevantIds,
      aggregated,
      products: input.products,
      engagedCategoryCounts,
      maxCandidates: config.maxCandidates,
      minCandidates: config.minCandidates,
    });

    if (candidateIds.length < config.minCandidates) {
      continue;
    }

    const sliders =
      latestSliderByUser.get(endUserId) ??
      inferSlidersFromBehavior(relevantIds, aggregated, productsById, productFreshness);

    const candidates: EvaluationCandidate[] = candidateIds.flatMap((productId) => {
      const product = productsById.get(productId);
      if (!product) return [];
      const category = normalizeCategory(product.category);
      const userSignal = aggregated.get(productId);
      const globalCount = globalInteractionCounts.get(productId) ?? 0;
      const categoryCount = engagedCategoryCounts.get(category) ?? 0;
      const diversitySignal =
        engagedCategoryCounts.size <= 1
          ? categoryCount > 0
            ? 0.45
            : 1
          : categoryCount > 0
            ? Math.max(0.25, 1 - categoryCount / totalMapValues(engagedCategoryCounts))
            : 1;

      return [
        {
          id: product.id,
          name: product.name,
          category,
          similarity: clamp(
            userSignal
              ? 0.55 + userSignal.weightedScore * 0.4
              : inferCategoryAffinity(category, engagedCategoryCounts) * 0.45 + 0.1
          ),
          diversitySignal: clamp(diversitySignal),
          noveltySignal: productFreshness.get(product.id) ?? 0.5,
          popularitySignal:
            globalInteractionCounts.size === 0
              ? 0.5
              : clamp(globalCount / Math.max(...globalInteractionCounts.values())),
        },
      ];
    });

    candidateScenarios.push({
      id: `feedback-${sanitizeId(endUserId)}`,
      description: buildScenarioDescription(
        endUserId,
        relevantIds,
        productsById,
        sliders
      ),
      sliders,
      candidates,
      relevantIds,
      expectedTopIds: relevantIds.slice(0, Math.min(2, relevantIds.length)),
    });
  }

  return {
    name: input.datasetName,
    scenarios: candidateScenarios
      .sort((left, right) => right.relevantIds.length - left.relevantIds.length)
      .slice(0, config.maxScenarios),
  };
}

function aggregateUserProductSignals(
  events: FeedbackEvalEvent[],
  productsById: Map<string, FeedbackEvalProduct>
) {
  const aggregated = new Map<
    string,
    { weightedScore: number; count: number; latestTimestamp: number }
  >();

  for (const event of events) {
    if (!event.productId || !productsById.has(event.productId)) {
      continue;
    }
    const timestamp = toTimestamp(event.createdAt);
    const recencyBoost = timestamp === 0 ? 1 : 1 + timestamp / (timestamp + 1);
    const weighted = EVENT_WEIGHT[event.eventType] * Math.min(recencyBoost, 1.25);
    const current = aggregated.get(event.productId) ?? {
      weightedScore: 0,
      count: 0,
      latestTimestamp: 0,
    };
    current.weightedScore += weighted;
    current.count += 1;
    current.latestTimestamp = Math.max(current.latestTimestamp, timestamp);
    aggregated.set(event.productId, current);
  }

  for (const signal of aggregated.values()) {
    signal.weightedScore = clamp(signal.weightedScore / Math.max(signal.count, 1));
  }

  return aggregated;
}

function countGlobalInteractions(
  events: FeedbackEvalEvent[],
  productsById: Map<string, FeedbackEvalProduct>
) {
  const counts = new Map<string, number>();
  for (const event of events) {
    if (!event.productId || !productsById.has(event.productId)) continue;
    counts.set(event.productId, (counts.get(event.productId) ?? 0) + 1);
  }
  return counts;
}

function countCategoryInteractions(
  events: FeedbackEvalEvent[],
  productsById: Map<string, FeedbackEvalProduct>
) {
  const counts = new Map<string, number>();
  for (const event of events) {
    if (!event.productId) continue;
    const category = normalizeCategory(productsById.get(event.productId)?.category);
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  return counts;
}

function buildFreshnessScores(products: FeedbackEvalProduct[]) {
  const timestamps = products
    .map((product) => toTimestamp(product.createdAt))
    .filter((value) => value > 0);
  const min = timestamps.length > 0 ? Math.min(...timestamps) : 0;
  const max = timestamps.length > 0 ? Math.max(...timestamps) : 0;
  const denominator = max - min || 1;
  const scores = new Map<string, number>();

  for (const product of products) {
    const value = toTimestamp(product.createdAt);
    scores.set(
      product.id,
      value > 0 ? clamp((value - min) / denominator) : 0.5
    );
  }

  return scores;
}

function getLatestSliderByUser(
  events: FeedbackEvalRecommendationEvent[]
): Map<string, SliderConfig> {
  const latest = new Map<string, { timestamp: number; sliders: SliderConfig }>();

  for (const event of events) {
    if (!event.sliders) continue;
    const timestamp = toTimestamp(event.createdAt);
    const normalized = normalizeSliders(event.sliders);
    const current = latest.get(event.endUserId);
    if (!current || timestamp >= current.timestamp) {
      latest.set(event.endUserId, { timestamp, sliders: normalized });
    }
  }

  return new Map(
    Array.from(latest.entries()).map(([endUserId, entry]) => [endUserId, entry.sliders])
  );
}

function inferSlidersFromBehavior(
  relevantIds: string[],
  aggregated: Map<string, { weightedScore: number; count: number; latestTimestamp: number }>,
  productsById: Map<string, FeedbackEvalProduct>,
  freshness: Map<string, number>
): SliderConfig {
  const relevantCategories = new Set(
    relevantIds.map((id) => normalizeCategory(productsById.get(id)?.category))
  );
  const noveltyValues = relevantIds.map((id) => freshness.get(id) ?? 0.5);
  const averageNovelty = average(noveltyValues);
  const repeatEngagement = average(
    relevantIds.map((id) => Math.min(1, (aggregated.get(id)?.count ?? 1) / 3))
  );

  return normalizeSliders({
    relevance: 0.82,
    diversity: clamp(0.25 + relevantCategories.size / Math.max(relevantIds.length, 1) * 0.75),
    novelty: clamp(0.25 + averageNovelty * 0.7),
    popularity: clamp(0.2 + repeatEngagement * 0.6),
  });
}

function pickCandidateIds(params: {
  relevantIds: string[];
  aggregated: Map<string, { weightedScore: number; count: number; latestTimestamp: number }>;
  products: FeedbackEvalProduct[];
  engagedCategoryCounts: Map<string, number>;
  maxCandidates: number;
  minCandidates: number;
}) {
  const relevantSet = new Set(params.relevantIds);
  const supplemental = params.products
    .filter((product) => !relevantSet.has(product.id))
    .sort((left, right) => {
      const leftSeen = params.aggregated.get(left.id)?.weightedScore ?? 0;
      const rightSeen = params.aggregated.get(right.id)?.weightedScore ?? 0;
      if (rightSeen !== leftSeen) {
        return rightSeen - leftSeen;
      }

      const leftAffinity = inferCategoryAffinity(
        normalizeCategory(left.category),
        params.engagedCategoryCounts
      );
      const rightAffinity = inferCategoryAffinity(
        normalizeCategory(right.category),
        params.engagedCategoryCounts
      );

      if (rightAffinity !== leftAffinity) {
        return rightAffinity - leftAffinity;
      }

      return left.name.localeCompare(right.name);
    })
    .slice(0, Math.max(params.maxCandidates - params.relevantIds.length, params.minCandidates));

  return [...params.relevantIds, ...supplemental.map((product) => product.id)].slice(
    0,
    params.maxCandidates
  );
}

function buildScenarioDescription(
  endUserId: string,
  relevantIds: string[],
  productsById: Map<string, FeedbackEvalProduct>,
  sliders: SliderConfig
) {
  const categories = Array.from(
    new Set(relevantIds.map((id) => normalizeCategory(productsById.get(id)?.category)))
  );
  return `Behavior-derived scenario for ${endUserId} based on ${relevantIds.length} strong interactions across ${categories.join(", ")}. Inferred sliders emphasize relevance=${sliders.relevance.toFixed(2)}, diversity=${sliders.diversity.toFixed(2)}, novelty=${sliders.novelty.toFixed(2)}, popularity=${sliders.popularity.toFixed(2)}.`;
}

function inferCategoryAffinity(
  category: string,
  engagedCategoryCounts: Map<string, number>
) {
  const total = totalMapValues(engagedCategoryCounts);
  if (total === 0) return 0.4;
  return (engagedCategoryCounts.get(category) ?? 0) / total;
}

function normalizeSliders(input: Partial<SliderConfig>): SliderConfig {
  return {
    relevance: clamp(input.relevance ?? 0.5),
    diversity: clamp(input.diversity ?? 0.5),
    novelty: clamp(input.novelty ?? 0.5),
    popularity: clamp(input.popularity ?? 0.5),
  };
}

function normalizeCategory(category: string | null | undefined) {
  return category?.trim() || "uncategorized";
}

function sanitizeId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase();
}

function totalMapValues(map: Map<string, number>) {
  return Array.from(map.values()).reduce((sum, value) => sum + value, 0);
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function toTimestamp(value: string | Date | null) {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

function groupBy<T, K>(items: T[], keyFn: (item: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const existing = groups.get(key);
    if (existing) {
      existing.push(item);
    } else {
      groups.set(key, [item]);
    }
  }
  return groups;
}

function compactDefinedOptions(
  options: FeedbackDerivedDatasetOptions | undefined
): Partial<Required<FeedbackDerivedDatasetOptions>> {
  if (!options) return {};

  return Object.fromEntries(
    Object.entries(options).filter(([, value]) => value !== undefined)
  ) as Partial<Required<FeedbackDerivedDatasetOptions>>;
}
