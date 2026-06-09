import { describe, expect, it } from "vitest";
import {
  evaluateScenario,
  getQualityGateFailures,
  RECOMMENDATION_QUALITY_GATES,
  summarizeEvaluations,
} from "../evaluation";
import { recommendationEvaluationFixtures } from "../evaluation-fixtures";

describe("recommendation evaluation harness", () => {
  it("keeps top-ranked results aligned with scenario relevance expectations", () => {
    const results = recommendationEvaluationFixtures.map(evaluateScenario);

    for (const result of results) {
      const expectedTopIds = result.scenario.expectedTopIds ?? [];
      const actualTopIds = result.ranked.slice(0, expectedTopIds.length).map((item) => item.id);
      expect(actualTopIds).toEqual(expectedTopIds);
    }
  });

  it("meets baseline quality thresholds across representative scenarios", () => {
    const summary = summarizeEvaluations(
      recommendationEvaluationFixtures.map(evaluateScenario)
    );

    expect(summary.averagePrecisionAt3).toBeGreaterThanOrEqual(
      RECOMMENDATION_QUALITY_GATES.averagePrecisionAt3
    );
    expect(summary.averagePrecisionAt5).toBeGreaterThanOrEqual(
      RECOMMENDATION_QUALITY_GATES.averagePrecisionAt5
    );
    expect(summary.averageNdcgAt5).toBeGreaterThanOrEqual(
      RECOMMENDATION_QUALITY_GATES.averageNdcgAt5
    );
    expect(summary.averageCategoryCoverageAt5).toBeGreaterThanOrEqual(
      RECOMMENDATION_QUALITY_GATES.averageCategoryCoverageAt5
    );
    expect(summary.averageConfidenceAt5).toBeGreaterThanOrEqual(
      RECOMMENDATION_QUALITY_GATES.averageConfidenceAt5
    );
    expect(getQualityGateFailures(summary)).toEqual([]);
  });

  it("returns scenario-level metrics that expose ranking tradeoffs", () => {
    const exploration = evaluateScenario(
      recommendationEvaluationFixtures.find(
        (scenario) => scenario.id === "exploration-home-lifestyle"
      )!
    );
    const focused = evaluateScenario(
      recommendationEvaluationFixtures.find(
        (scenario) => scenario.id === "high-intent-headphones"
      )!
    );

    expect(exploration.metrics.categoryCoverageAt5).toBeGreaterThan(
      focused.metrics.categoryCoverageAt5
    );
    expect(exploration.ranked[0]?.category).not.toBe(exploration.ranked[1]?.category);
    expect(focused.ranked[0]?.id).toBe("p-headphones-pro");
  });

  it("keeps novelty-seeking scenarios from ranking stale bestsellers above fresh alternatives", () => {
    const novelty = evaluateScenario(
      recommendationEvaluationFixtures.find(
        (scenario) => scenario.id === "fresh-fashion-drop"
      )!
    );

    expect(new Set(novelty.ranked.slice(0, 3).map((item) => item.id))).toEqual(
      new Set(["p-jacket-new", "p-sneakers-new", "p-bag-new"])
    );
    expect(novelty.ranked.slice(0, 3).every((item) => item.id !== "p-jacket-best-seller")).toBe(
      true
    );
  });
});
