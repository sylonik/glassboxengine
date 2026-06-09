import { mkdtemp, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import { runFeedbackExportEval } from "../scripts/run-feedback-export-eval-lib";

const tempDirs: string[] = [];
const testDir = dirname(fileURLToPath(import.meta.url));
const sampleExportPath = resolve(testDir, "../../evals/sample-feedback-export.json");

afterAll(async () => {
  const { rm } = await import("node:fs/promises");
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("feedback export evaluation pipeline", () => {
  it("writes dataset, report, text, and summary artifacts", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "glassbox-feedback-eval-"));
    tempDirs.push(tempDir);

    const result = await runFeedbackExportEval({
      inputPath: sampleExportPath,
      outDir: tempDir,
    });

    const summary = JSON.parse(
      await readFile(join(tempDir, "recommendation-eval.summary.json"), "utf8")
    ) as {
      releaseGatesPassed: boolean;
      scenarioCount: number;
    };

    expect(summary.releaseGatesPassed).toBe(true);
    expect(summary.scenarioCount).toBe(1);
    expect(result.gateFailures).toEqual([]);

    await expect(
      readFile(join(tempDir, "recommendation-eval.dataset.json"), "utf8")
    ).resolves.toContain("\"scenarios\"");
    await expect(
      readFile(join(tempDir, "recommendation-eval.report.json"), "utf8")
    ).resolves.toContain("\"gateFailures\": []");
    await expect(
      readFile(join(tempDir, "recommendation-eval.report.txt"), "utf8")
    ).resolves.toContain("Release gates: PASS");
  });
});
