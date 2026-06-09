import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  evaluateScenario,
  getQualityGateFailures,
  RECOMMENDATION_QUALITY_GATES,
  summarizeEvaluations,
} from "../evaluation";
import { loadFeedbackEvalExport } from "../feedback-eval-exports";
import { createEvaluationDatasetFromFeedback } from "../evaluation-from-feedback";
import {
  createRecommendationEvalReport,
  renderRecommendationEvalTextReport,
} from "./recommendation-eval-utils";

export interface RunFeedbackExportEvalOptions {
  inputPath: string;
  outDir: string;
  maxScenarios?: number;
  maxCandidates?: number;
  minRelevantEvents?: number;
}

export async function runFeedbackExportEval(
  options: RunFeedbackExportEvalOptions
) {
  const exportData = await loadFeedbackEvalExport(resolve(options.inputPath));
  const dataset = createEvaluationDatasetFromFeedback(exportData, {
    maxScenarios: options.maxScenarios,
    maxCandidates: options.maxCandidates,
    minRelevantEvents: options.minRelevantEvents,
  });

  const results = dataset.scenarios.map(evaluateScenario);
  const summary = summarizeEvaluations(results);
  const gateFailures = getQualityGateFailures(summary);
  const report = createRecommendationEvalReport(
    dataset.name,
    results,
    summary,
    gateFailures
  );
  const textReport = renderRecommendationEvalTextReport(
    report,
    RECOMMENDATION_QUALITY_GATES
  );

  const outDir = resolve(options.outDir);
  await mkdir(outDir, { recursive: true });
  await writeFile(
    resolve(outDir, "recommendation-eval.dataset.json"),
    `${JSON.stringify(dataset, null, 2)}\n`,
    "utf8"
  );
  await writeFile(
    resolve(outDir, "recommendation-eval.report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8"
  );
  await writeFile(
    resolve(outDir, "recommendation-eval.report.txt"),
    `${textReport}\n`,
    "utf8"
  );
  await writeFile(
    resolve(outDir, "recommendation-eval.summary.json"),
    `${JSON.stringify(
      {
        datasetName: report.datasetName,
        generatedAt: report.generatedAt,
        scenarioCount: report.scenarioCount,
        gateFailures: report.gateFailures,
        releaseGatesPassed: report.gateFailures.length === 0,
        summary: report.summary,
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  return {
    dataset,
    report,
    textReport,
    outDir,
    gateFailures,
  };
}
