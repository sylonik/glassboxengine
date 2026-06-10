import { and, eq, sql, asc } from "drizzle-orm";
import { cosineDistance } from "drizzle-orm";
import { db } from "@glassbox/database/client";
import { products } from "@glassbox/database/schema";
import { generateEmbedding } from "./embedding-generator";
import {
  buildSearchParams,
  explainSliderTranslation,
} from "./sql-builder";
import {
  computeCompositeScore,
  computeConfidenceScore,
  normalizeWeights,
  supportSignalMultiplier,
  type CandidateSignals,
} from "./scoring";
import type { SliderConfig } from "@glassbox/database";
import {
  clampScore,
  type PolicySpec,
  type RankedRecommendationItem,
} from "./contracts";

export type RankedItem = RankedRecommendationItem;

export interface ArchitectResult {
  rankedFeed: RankedItem[];
  searchExplanation: string;
  queryParams: ReturnType<typeof buildSearchParams>;
  policy: PolicySpec;
}

/**
 * Architect Agent: Translates slider positions into pgvector search queries
 * and returns a ranked feed with Glass Box explanations.
 *
 * When a precomputedEmbedding is provided (e.g. from a persona's preferenceVector),
 * it is used directly instead of generating one from queryText.
 */
export async function runArchitectAgent(
  queryText: string,
  sliders: SliderConfig,
  userId: string,
  projectId?: string,
  precomputedEmbedding?: number[],
  options?: {
    limit?: number;
    category?: string;
    policy: PolicySpec;
  }
): Promise<ArchitectResult> {
  // 1. Build search parameters from sliders
  const queryParams = buildSearchParams(sliders);
  const resultLimit = options?.limit ?? queryParams.limit;

  // 2. Generate query embedding (or use persona's preference vector)
  const queryEmbedding = precomputedEmbedding ?? await generateEmbedding(queryText);

  const baseConditions = [
    eq(products.userId, userId),
    projectId ? eq(products.projectId, projectId) : undefined,
    options?.category ? eq(products.category, options.category) : undefined,
    sql`${products.embedding} IS NOT NULL`,
  ];

  const distance = sql<number>`(${cosineDistance(
    products.embedding,
    queryEmbedding
  )})`;

  // 3. Execute pgvector similarity search. Start strict, then fall back to the
  // closest available items if the threshold is too aggressive for the current catalog.
  const strictResults = await db
    .select({
      id: products.id,
      externalId: products.externalId,
      name: products.name,
      description: products.description,
      category: products.category,
      metadata: products.metadata,
      similarity: sql<number>`1 - ${distance}`,
      })
      .from(products)
      .where(
        and(...baseConditions, sql`${distance} < ${1 - queryParams.similarityThreshold}`)
      )
      .orderBy(asc(distance))
      .limit(resultLimit);

  const results =
    strictResults.length > 0
      ? strictResults
      : await db
          .select({
            id: products.id,
            externalId: products.externalId,
            name: products.name,
            description: products.description,
            category: products.category,
            metadata: products.metadata,
            similarity: sql<number>`1 - ${distance}`,
          })
          .from(products)
          .where(and(...baseConditions))
          .orderBy(asc(distance))
          .limit(resultLimit);

  // 4. Apply slider weights to re-rank
  const categoryCounts = new Map<string, number>();
  const rankedFeed: RankedItem[] = results.map((item, index) => {
    const similarity = Number(item.similarity);
    const relevanceSignal = clampScore(similarity);
    const categoryKey = item.category ?? "uncategorized";
    const categorySeen = categoryCounts.get(categoryKey) ?? 0;
    categoryCounts.set(categoryKey, categorySeen + 1);

    const diversitySignal = clampScore(1 - categorySeen / Math.max(results.length, 1));
    const isNewInventory = item.metadata && typeof item.metadata === "object" && item.metadata !== null
      ? (item.metadata as Record<string, unknown>).inventory === "new"
      : false;
    const noveltySignal = isNewInventory ? 1 : 0.45;

    const rawPopularity = item.metadata && typeof item.metadata === "object" && item.metadata !== null
      ? (item.metadata as Record<string, unknown>).popularityScore
      : undefined;
    const popularitySignal =
      typeof rawPopularity === "number"
        ? clampScore(rawPopularity)
        : clampScore(0.55 + (results.length - index - 1) / Math.max(results.length * 4, 1));

    const scoreBreakdown = buildScoreBreakdown(queryParams.weights, {
      similarity: relevanceSignal,
      diversitySignal,
      noveltySignal,
      popularitySignal,
    }, {
      rawSimilarity: similarity,
      categorySeen,
      isNewInventory,
      hasCatalogPopularity: typeof rawPopularity === "number",
    });

    const finalScore = computeCompositeScore(queryParams.weights, {
      similarity: relevanceSignal,
      diversitySignal,
      noveltySignal,
      popularitySignal,
    });
    const confidenceScore = computeConfidenceScore(relevanceSignal, finalScore);
    const matchedSignals = scoreBreakdown
      .filter((factor) => factor.weightedValue > 0)
      .sort((a, b) => b.weightedValue - a.weightedValue)
      .slice(0, 2)
      .map((factor) => factor.name);

    // external_id is namespaced as "<projectId>:<integrator id>" in the DB;
    // surface the integrator's original id at the API boundary.
    const externalId =
      projectId && item.externalId?.startsWith(`${projectId}:`)
        ? item.externalId.slice(projectId.length + 1)
        : item.externalId;

    return {
      id: item.id,
      itemId: item.id,
      externalId,
      name: item.name,
      description: item.description,
      category: item.category,
      similarity,
      score: finalScore,
      scoreBreakdown,
      matchedSignals,
      reasoning: `Ranked #${index + 1} with score ${finalScore.toFixed(3)} from relevance-led ranking and supporting diversity, novelty, and popularity signals. ${explainSliderTranslation(sliders)}`,
      confidenceScore,
    };
  });

  // Rank by the policy-aware score. Confidence remains a diagnostic signal.
  rankedFeed.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return b.confidenceScore - a.confidenceScore;
  });

  return {
    rankedFeed,
    searchExplanation:
      strictResults.length > 0
        ? `${explainSliderTranslation(sliders)}${options?.category ? ` Restricted to category "${options.category}".` : ""}`
        : `${explainSliderTranslation(sliders)} No items met the similarity threshold, so the closest matches are shown instead.${options?.category ? ` Restricted to category "${options.category}".` : ""}`,
    queryParams,
    policy: options!.policy,
  };
}

function buildScoreBreakdown(
  weights: ReturnType<typeof buildSearchParams>["weights"],
  signals: CandidateSignals,
  context: {
    rawSimilarity: number;
    categorySeen: number;
    isNewInventory: boolean;
    hasCatalogPopularity: boolean;
  }
) {
  const normalizedWeights = normalizeWeights(weights);
  const supportMultiplier = supportSignalMultiplier(signals.similarity);

  return [
      {
        name: "relevance",
        weight: normalizedWeights.similarity,
        rawValue: signals.similarity,
        weightedValue: signals.similarity * normalizedWeights.similarity,
        contribution:
          context.rawSimilarity > 0
            ? `${(signals.similarity * 100).toFixed(0)}% semantic match`
            : "No strong semantic match; ranking leans on business policy signals",
      },
      {
        name: "diversity",
        weight: normalizedWeights.diversity * supportMultiplier,
        rawValue: signals.diversitySignal,
        weightedValue: signals.diversitySignal * normalizedWeights.diversity * supportMultiplier,
        contribution:
          context.categorySeen === 0
            ? "Introduces category variety"
            : "Category already present in the candidate set",
      },
      {
        name: "novelty",
        weight: normalizedWeights.novelty * supportMultiplier,
        rawValue: signals.noveltySignal,
        weightedValue: signals.noveltySignal * normalizedWeights.novelty * supportMultiplier,
        contribution: context.isNewInventory
          ? "Fresh inventory boost applied"
          : "Established item with lower novelty boost",
      },
      {
        name: "popularity",
        weight: normalizedWeights.popularity * supportMultiplier,
        rawValue: signals.popularitySignal,
        weightedValue: signals.popularitySignal * normalizedWeights.popularity * supportMultiplier,
        contribution:
          context.hasCatalogPopularity
            ? "Catalog popularity score applied"
            : "Popularity fallback derived from candidate ordering",
      },
    ];
}
