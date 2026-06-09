import { clampScore } from "./contracts";

export interface CandidateSignals {
  similarity: number;
  diversitySignal: number;
  noveltySignal: number;
  popularitySignal: number;
}

export interface RankingWeights {
  similarity: number;
  diversity: number;
  novelty: number;
  popularity: number;
}

export function computeCompositeScore(
  weights: RankingWeights,
  signals: CandidateSignals
): number {
  const normalizedWeights = normalizeWeights(weights);
  const supportMultiplier = supportSignalMultiplier(signals.similarity);
  const relevanceComponent = signals.similarity * normalizedWeights.similarity;
  const supportWeight =
    normalizedWeights.diversity + normalizedWeights.novelty + normalizedWeights.popularity;
  const supportComponent =
    (signals.diversitySignal * normalizedWeights.diversity +
      signals.noveltySignal * normalizedWeights.novelty +
      signals.popularitySignal * normalizedWeights.popularity) *
    supportMultiplier;
  const score = relevanceComponent + supportComponent;

  if (supportWeight <= 0) {
    return clampScore(relevanceComponent);
  }

  return clampScore(score);
}

export function computeConfidenceScore(similarity: number, finalScore: number): number {
  return clampScore(similarity * 0.7 + finalScore * 0.3);
}

export function normalizeWeights(weights: RankingWeights): RankingWeights {
  const total =
    weights.similarity + weights.diversity + weights.novelty + weights.popularity;

  if (total <= 0) {
    return {
      similarity: 1,
      diversity: 0,
      novelty: 0,
      popularity: 0,
    };
  }

  return {
    similarity: weights.similarity / total,
    diversity: weights.diversity / total,
    novelty: weights.novelty / total,
    popularity: weights.popularity / total,
  };
}

export function supportSignalMultiplier(similarity: number): number {
  return 0.2 + similarity * 0.5;
}
