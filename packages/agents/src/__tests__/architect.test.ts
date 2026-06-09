import { describe, expect, it } from "vitest";
import { buildSearchParams } from "../sql-builder";
import { computeCompositeScore } from "../scoring";
import type { SliderConfig } from "@glassbox/database";

describe("computeCompositeScore", () => {
  it("keeps stronger semantic matches above support-heavy weaker matches", () => {
    const sliders: SliderConfig = {
      relevance: 0.76,
      diversity: 0.52,
      novelty: 0.41,
      popularity: 0.58,
    };
    const { weights } = buildSearchParams(sliders);

    const strongMatch = computeCompositeScore(weights, {
      similarity: 0.86,
      diversitySignal: 0.3,
      noveltySignal: 0.45,
      popularitySignal: 0.5,
    });
    const supportHeavyMatch = computeCompositeScore(weights, {
      similarity: 0.36,
      diversitySignal: 1,
      noveltySignal: 1,
      popularitySignal: 1,
    });

    expect(strongMatch).toBeGreaterThan(supportHeavyMatch);
  });

  it("does not saturate ordinary candidate blends at one", () => {
    const sliders: SliderConfig = {
      relevance: 0.76,
      diversity: 0.52,
      novelty: 0.41,
      popularity: 0.58,
    };
    const { weights } = buildSearchParams(sliders);

    const score = computeCompositeScore(weights, {
      similarity: 0.62,
      diversitySignal: 0.8,
      noveltySignal: 0.45,
      popularitySignal: 0.6,
    });

    expect(score).toBeGreaterThan(0.4);
    expect(score).toBeLessThan(0.95);
  });
});
