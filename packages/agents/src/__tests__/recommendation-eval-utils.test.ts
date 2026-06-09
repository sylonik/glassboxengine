import { describe, expect, it, vi } from "vitest";
import { recommendationEvaluationFixtures } from "../evaluation-fixtures";
import {
  evaluateScenario,
  getQualityGateFailures,
  summarizeEvaluations,
} from "../evaluation";
import {
  createRecommendationEvalReport,
  renderRecommendationEvalTextReport,
} from "../scripts/recommendation-eval-utils";

describe("recommendation eval utils", () => {
  it("includes scenario count and generation timestamp in reports", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-06T12:00:00.000Z"));
    const results = recommendationEvaluationFixtures.map(evaluateScenario);
    const summary = summarizeEvaluations(results);
    const report = createRecommendationEvalReport(
      "fixtures",
      results,
      summary,
      getQualityGateFailures(summary)
    );

    expect(report.scenarioCount).toBe(3);
    expect(report.generatedAt).toBe("2026-06-06T12:00:00.000Z");
    vi.useRealTimers();
  });

  it("renders generation metadata in text output", () => {
    const results = recommendationEvaluationFixtures.map(evaluateScenario);
    const summary = summarizeEvaluations(results);
    const report = createRecommendationEvalReport(
      "fixtures",
      results,
      summary,
      getQualityGateFailures(summary)
    );

    const text = renderRecommendationEvalTextReport(report, {
      averagePrecisionAt3: 0.77,
      averagePrecisionAt5: 0.66,
      averageNdcgAt5: 0.9,
      averageCategoryCoverageAt5: 0.56,
      averageConfidenceAt5: 0.63,
    });

    expect(text).toContain("Generated:");
    expect(text).toContain("Scenarios: 3");
  });
});
