import type { SliderConfig } from "@glassbox/database";
import { buildSearchParams } from "./sql-builder";
import {
  computeCompositeScore,
  computeConfidenceScore,
  type CandidateSignals,
} from "./scoring";

export interface EvaluationCandidate extends CandidateSignals {
  id: string;
  name: string;
  category: string;
}

export interface EvaluationScenario {
  id: string;
  description: string;
  sliders: SliderConfig;
  candidates: EvaluationCandidate[];
  relevantIds: string[];
  expectedTopIds?: string[];
}

export interface RankedEvaluationCandidate extends EvaluationCandidate {
  score: number;
  confidenceScore: number;
}

export interface ScenarioMetrics {
  precisionAt3: number;
  precisionAt5: number;
  ndcgAt5: number;
  categoryCoverageAt5: number;
  averageConfidenceAt5: number;
}

export interface ScenarioEvaluationResult {
  scenario: EvaluationScenario;
  ranked: RankedEvaluationCandidate[];
  metrics: ScenarioMetrics;
}

export interface RecommendationEvaluationSummary {
  averagePrecisionAt3: number;
  averagePrecisionAt5: number;
  averageNdcgAt5: number;
  averageCategoryCoverageAt5: number;
  averageConfidenceAt5: number;
}

export const RECOMMENDATION_QUALITY_GATES = {
  averagePrecisionAt3: 0.77,
  averagePrecisionAt5: 0.66,
  averageNdcgAt5: 0.9,
  averageCategoryCoverageAt5: 0.56,
  averageConfidenceAt5: 0.63,
} as const;

export function rankEvaluationCandidates(
  sliders: SliderConfig,
  candidates: EvaluationCandidate[]
): RankedEvaluationCandidate[] {
  const { weights } = buildSearchParams(sliders);

  return candidates
    .map((candidate) => {
      const score = computeCompositeScore(weights, candidate);
      const confidenceScore = computeConfidenceScore(candidate.similarity, score);
      return {
        ...candidate,
        score,
        confidenceScore,
      };
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return right.confidenceScore - left.confidenceScore;
    });
}

export function evaluateScenario(
  scenario: EvaluationScenario
): ScenarioEvaluationResult {
  const ranked = rankEvaluationCandidates(scenario.sliders, scenario.candidates);
  const top3 = ranked.slice(0, 3);
  const top5 = ranked.slice(0, 5);
  const relevant = new Set(scenario.relevantIds);

  return {
    scenario,
    ranked,
    metrics: {
      precisionAt3: precisionAtK(top3, relevant),
      precisionAt5: precisionAtK(top5, relevant),
      ndcgAt5: ndcgAtK(top5, relevant, 5),
      categoryCoverageAt5: categoryCoverageAtK(top5, 5),
      averageConfidenceAt5: average(top5.map((candidate) => candidate.confidenceScore)),
    },
  };
}

export function summarizeEvaluations(
  results: ScenarioEvaluationResult[]
): RecommendationEvaluationSummary {
  return {
    averagePrecisionAt3: average(results.map((result) => result.metrics.precisionAt3)),
    averagePrecisionAt5: average(results.map((result) => result.metrics.precisionAt5)),
    averageNdcgAt5: average(results.map((result) => result.metrics.ndcgAt5)),
    averageCategoryCoverageAt5: average(
      results.map((result) => result.metrics.categoryCoverageAt5)
    ),
    averageConfidenceAt5: average(
      results.map((result) => result.metrics.averageConfidenceAt5)
    ),
  };
}

export function getQualityGateFailures(
  summary: RecommendationEvaluationSummary
): string[] {
  const failures: string[] = [];

  if (summary.averagePrecisionAt3 < RECOMMENDATION_QUALITY_GATES.averagePrecisionAt3) {
    failures.push("averagePrecisionAt3");
  }
  if (summary.averagePrecisionAt5 < RECOMMENDATION_QUALITY_GATES.averagePrecisionAt5) {
    failures.push("averagePrecisionAt5");
  }
  if (summary.averageNdcgAt5 < RECOMMENDATION_QUALITY_GATES.averageNdcgAt5) {
    failures.push("averageNdcgAt5");
  }
  if (
    summary.averageCategoryCoverageAt5 <
    RECOMMENDATION_QUALITY_GATES.averageCategoryCoverageAt5
  ) {
    failures.push("averageCategoryCoverageAt5");
  }
  if (
    summary.averageConfidenceAt5 <
    RECOMMENDATION_QUALITY_GATES.averageConfidenceAt5
  ) {
    failures.push("averageConfidenceAt5");
  }

  return failures;
}

function precisionAtK(
  ranked: Array<{ id: string }>,
  relevant: Set<string>
): number {
  if (ranked.length === 0) return 0;
  const hits = ranked.filter((candidate) => relevant.has(candidate.id)).length;
  return hits / ranked.length;
}

function ndcgAtK(
  ranked: Array<{ id: string }>,
  relevant: Set<string>,
  k: number
): number {
  const dcg = ranked.slice(0, k).reduce<number>((total, candidate, index) => {
    const gain = relevant.has(candidate.id) ? 1 : 0;
    return total + gain / Math.log2(index + 2);
  }, 0);

  const idealCount = Math.min(relevant.size, k);
  const idcg = Array.from({ length: idealCount }).reduce<number>((total, _, index) => {
    return total + 1 / Math.log2(index + 2);
  }, 0);

  return idcg === 0 ? 0 : dcg / idcg;
}

function categoryCoverageAtK(
  ranked: Array<{ category: string }>,
  k: number
): number {
  if (ranked.length === 0) return 0;
  return new Set(ranked.slice(0, k).map((candidate) => candidate.category)).size /
    Math.min(k, ranked.length);
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}
