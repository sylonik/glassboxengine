import { readFile } from "node:fs/promises";
import { z } from "zod";
import type {
  EvaluationCandidate,
  EvaluationScenario,
} from "./evaluation";

const sliderConfigSchema = z.object({
  relevance: z.number(),
  diversity: z.number(),
  novelty: z.number(),
  popularity: z.number(),
});

const evaluationCandidateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  similarity: z.number(),
  diversitySignal: z.number(),
  noveltySignal: z.number(),
  popularitySignal: z.number(),
});

const evaluationScenarioSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  sliders: sliderConfigSchema,
  candidates: z.array(evaluationCandidateSchema).min(1),
  relevantIds: z.array(z.string().min(1)).min(1),
  expectedTopIds: z.array(z.string().min(1)).optional(),
});

const evaluationDatasetSchema = z.object({
  name: z.string().min(1),
  scenarios: z.array(evaluationScenarioSchema).min(1),
});

export interface EvaluationDataset {
  name: string;
  scenarios: EvaluationScenario[];
}

export async function loadEvaluationDataset(
  datasetPath: string
): Promise<EvaluationDataset> {
  const raw = await readFile(datasetPath, "utf8");
  const parsed = evaluationDatasetSchema.parse(JSON.parse(raw));

  return {
    name: parsed.name,
    scenarios: parsed.scenarios,
  };
}
