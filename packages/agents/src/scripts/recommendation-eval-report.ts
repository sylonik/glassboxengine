import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  evaluateScenario,
  getQualityGateFailures,
  RECOMMENDATION_QUALITY_GATES,
  summarizeEvaluations,
} from "../evaluation";
import { loadEvaluationDataset } from "../evaluation-datasets";
import { recommendationEvaluationFixtures } from "../evaluation-fixtures";
import {
  createRecommendationEvalReport,
  renderRecommendationEvalTextReport,
} from "./recommendation-eval-utils";

const args = process.argv.slice(2);
const datasetFlagIndex = args.indexOf("--dataset");
const jsonOutFlagIndex = args.indexOf("--json-out");

const datasetPath =
  datasetFlagIndex >= 0 ? args[datasetFlagIndex + 1] : undefined;
const jsonOutPath =
  jsonOutFlagIndex >= 0 ? args[jsonOutFlagIndex + 1] : undefined;

const dataset = datasetPath
  ? await loadEvaluationDataset(resolve(datasetPath))
  : {
      name: "built-in-fixtures",
      scenarios: recommendationEvaluationFixtures,
    };

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

if (jsonOutPath) {
  const resolvedJsonOutPath = resolve(jsonOutPath);
  await mkdir(dirname(resolvedJsonOutPath), { recursive: true });
  await writeFile(resolvedJsonOutPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

console.log(textReport);

if (gateFailures.length > 0) {
  process.exitCode = 1;
}
