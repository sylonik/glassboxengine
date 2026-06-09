import { runFeedbackExportEval } from "./run-feedback-export-eval-lib";

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
const outDirArg = getArg("--out-dir");

if (!inputPath || !outDirArg) {
  throw new Error(
    "Usage: --input <feedback-export.json> --out-dir <dir> [--max-scenarios 25] [--max-candidates 12] [--min-relevant-events 2]"
  );
}

const result = await runFeedbackExportEval({
  inputPath,
  outDir: outDirArg,
  maxScenarios: getIntArg("--max-scenarios"),
  maxCandidates: getIntArg("--max-candidates"),
  minRelevantEvents: getIntArg("--min-relevant-events"),
});

console.log(result.textReport);
console.log(`Artifacts written to ${result.outDir}`);

if (result.gateFailures.length > 0) {
  process.exitCode = 1;
}
