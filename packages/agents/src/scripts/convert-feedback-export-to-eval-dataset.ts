import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { loadFeedbackEvalExport } from "../feedback-eval-exports";
import {
  createEvaluationDatasetFromFeedback,
  type FeedbackDerivedDatasetOptions,
} from "../evaluation-from-feedback";

const args = process.argv.slice(2);

function getArg(flag: string) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function getIntArg(flag: string) {
  const value = getArg(flag);
  return value ? parseInt(value, 10) : undefined;
}

const inputPath = getArg("--input");
const outPath = getArg("--out");

if (!inputPath || !outPath) {
  throw new Error(
    "Usage: --input <feedback-export.json> --out <eval-dataset.json> [--max-scenarios 25] [--max-candidates 12] [--min-relevant-events 2]"
  );
}

const exportData = await loadFeedbackEvalExport(resolve(inputPath));

const dataset = createEvaluationDatasetFromFeedback(
  exportData,
  {
    maxScenarios: getIntArg("--max-scenarios"),
    maxCandidates: getIntArg("--max-candidates"),
    minRelevantEvents: getIntArg("--min-relevant-events"),
  } satisfies FeedbackDerivedDatasetOptions
);

const resolvedOutPath = resolve(outPath);
await mkdir(dirname(resolvedOutPath), { recursive: true });
await writeFile(resolvedOutPath, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");

console.log(
  `Converted feedback export "${exportData.datasetName}" into ${dataset.scenarios.length} recommendation eval scenarios at ${resolvedOutPath}`
);
