import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadFeedbackEvalExport } from "../feedback-eval-exports";
import { createEvaluationDatasetFromFeedback } from "../evaluation-from-feedback";

const testDir = dirname(fileURLToPath(import.meta.url));
const sampleExportPath = resolve(testDir, "../../evals/sample-feedback-export.json");

describe("feedback eval exports", () => {
  it("loads a feedback export and converts it into an evaluation dataset", async () => {
    const input = await loadFeedbackEvalExport(sampleExportPath);
    const dataset = createEvaluationDatasetFromFeedback(input);

    expect(input.datasetName).toBe("sample-feedback-export");
    expect(dataset.scenarios).toHaveLength(1);
    expect(dataset.scenarios[0]?.relevantIds).toEqual([
      "p-headphones-pro",
      "p-earbuds-anc",
      "p-audio-case",
      "p-dac-portable",
      "p-cleaning-kit",
    ]);
  });
});
