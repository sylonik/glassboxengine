import { mkdtemp, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import { loadEvaluationDataset } from "../evaluation-datasets";
import {
  createRecommendationEvalReport,
  renderRecommendationEvalTextReport,
} from "../scripts/recommendation-eval-utils";
import {
  evaluateScenario,
  getQualityGateFailures,
  RECOMMENDATION_QUALITY_GATES,
  summarizeEvaluations,
} from "../evaluation";

const tempDirs: string[] = [];
const testDir = dirname(fileURLToPath(import.meta.url));
const sampleDatasetPath = resolve(
  testDir,
  "../../evals/sample-recommendation-eval.json"
);

afterAll(async () => {
  const { rm } = await import("node:fs/promises");
  await Promise.all(
    tempDirs.map((dir) => rm(dir, { recursive: true, force: true }))
  );
});

describe("evaluation datasets", () => {
  it("loads JSON datasets from disk and preserves scenario expectations", async () => {
    const dataset = await loadEvaluationDataset(sampleDatasetPath);

    expect(dataset.name).toBe("sample-catalog-personas");
    expect(dataset.scenarios).toHaveLength(2);
    expect(dataset.scenarios[0]?.expectedTopIds).toEqual([
      "sample-headphones-pro",
      "sample-headphones-lite",
    ]);
  });

  it("renders a text report for loaded datasets", async () => {
    const dataset = await loadEvaluationDataset(sampleDatasetPath);
    const results = dataset.scenarios.map(evaluateScenario);
    const summary = summarizeEvaluations(results);
    const gateFailures = getQualityGateFailures(summary);
    const report = createRecommendationEvalReport(
      dataset.name,
      results,
      summary,
      gateFailures
    );

    const text = renderRecommendationEvalTextReport(
      report,
      RECOMMENDATION_QUALITY_GATES
    );

    expect(text).toContain("Dataset: sample-catalog-personas");
    expect(text).toContain("fashion-freshness-sample");
  });

  it("rejects malformed datasets with schema validation", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "glassbox-eval-"));
    tempDirs.push(tempDir);
    const datasetPath = join(tempDir, "bad-dataset.json");

    await writeFile(
      datasetPath,
      JSON.stringify({
        name: "broken",
        scenarios: [
          {
            id: "missing-candidates",
            description: "Broken scenario",
            sliders: {
              relevance: 0.5,
              diversity: 0.5,
              novelty: 0.5,
              popularity: 0.5,
            },
            relevantIds: ["x"],
          },
        ],
      }),
      "utf8"
    );

    await expect(loadEvaluationDataset(datasetPath)).rejects.toThrow();
  });
});
