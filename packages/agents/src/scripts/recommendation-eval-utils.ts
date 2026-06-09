import type {
  RecommendationEvaluationSummary,
  ScenarioEvaluationResult,
} from "../evaluation";

export interface RecommendationEvalReport {
  datasetName: string;
  summary: RecommendationEvaluationSummary;
  gateFailures: string[];
  scenarioCount: number;
  generatedAt: string;
  scenarios: Array<{
    id: string;
    description: string;
    metrics: ScenarioEvaluationResult["metrics"];
    topFive: Array<{
      id: string;
      name: string;
      category: string;
      score: number;
      confidenceScore: number;
    }>;
  }>;
}

export function formatMetric(value: number): string {
  return value.toFixed(3);
}

export function createRecommendationEvalReport(
  datasetName: string,
  results: ScenarioEvaluationResult[],
  summary: RecommendationEvaluationSummary,
  gateFailures: string[]
): RecommendationEvalReport {
  return {
    datasetName,
    summary,
    gateFailures,
    scenarioCount: results.length,
    generatedAt: new Date().toISOString(),
    scenarios: results.map((result) => ({
      id: result.scenario.id,
      description: result.scenario.description,
      metrics: result.metrics,
      topFive: result.ranked.slice(0, 5).map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        score: item.score,
        confidenceScore: item.confidenceScore,
      })),
    })),
  };
}

export function renderRecommendationEvalTextReport(
  report: RecommendationEvalReport,
  thresholds: {
    averagePrecisionAt3: number;
    averagePrecisionAt5: number;
    averageNdcgAt5: number;
    averageCategoryCoverageAt5: number;
    averageConfidenceAt5: number;
  }
): string {
  const lines: string[] = [];

  lines.push("GlassBox Recommendation Quality Report");
  lines.push("");
  lines.push(`Dataset: ${report.datasetName}`);
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Scenarios: ${report.scenarioCount}`);
  lines.push("");
  lines.push("Summary");
  lines.push(
    `- Average precision@3: ${formatMetric(report.summary.averagePrecisionAt3)}`
  );
  lines.push(
    `- Average precision@5: ${formatMetric(report.summary.averagePrecisionAt5)}`
  );
  lines.push(`- Average ndcg@5: ${formatMetric(report.summary.averageNdcgAt5)}`);
  lines.push(
    `- Average category coverage@5: ${formatMetric(
      report.summary.averageCategoryCoverageAt5
    )}`
  );
  lines.push(
    `- Average confidence@5: ${formatMetric(report.summary.averageConfidenceAt5)}`
  );
  lines.push(
    `- Release gates: ${
      report.gateFailures.length === 0
        ? "PASS"
        : `FAIL (${report.gateFailures.join(", ")})`
    }`
  );
  lines.push(
    `- Thresholds: p@3>=${formatMetric(
      thresholds.averagePrecisionAt3
    )}, p@5>=${formatMetric(thresholds.averagePrecisionAt5)}, ndcg@5>=${formatMetric(
      thresholds.averageNdcgAt5
    )}, category@5>=${formatMetric(
      thresholds.averageCategoryCoverageAt5
    )}, conf@5>=${formatMetric(thresholds.averageConfidenceAt5)}`
  );
  lines.push("");

  for (const scenario of report.scenarios) {
    lines.push(scenario.id);
    lines.push(`- ${scenario.description}`);
    lines.push(
      `- Metrics: p@3=${formatMetric(scenario.metrics.precisionAt3)}, p@5=${formatMetric(
        scenario.metrics.precisionAt5
      )}, ndcg@5=${formatMetric(scenario.metrics.ndcgAt5)}, category@5=${formatMetric(
        scenario.metrics.categoryCoverageAt5
      )}, conf@5=${formatMetric(scenario.metrics.averageConfidenceAt5)}`
    );
    lines.push(
      `- Top 5: ${scenario.topFive
        .map((item) => `${item.name} (${formatMetric(item.confidenceScore)})`)
        .join(" | ")}`
    );
    lines.push("");
  }

  return lines.join("\n");
}
