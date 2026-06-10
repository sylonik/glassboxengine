import type { SliderConfig } from "@glassbox/database";
import { genai, DEFAULT_MODEL } from "./config";
import { buildSearchParams } from "./sql-builder";
import {
  callGlassboxAgent,
  isAgentServiceEnabled,
} from "./agent-service-client";
import { createLogger } from "@glassbox/telemetry";

const logger = createLogger("agents:architect-advisor");

export interface CatalogSummary {
  productCount: number;
  categories: Array<{ name: string; count: number }>;
}

export interface ArchitectProposal {
  profileName: string;
  sliders: SliderConfig;
  derived: {
    similarityThreshold: number;
    candidateLimit: number;
    weights: {
      similarity: number;
      diversity: number;
      novelty: number;
      popularity: number;
    };
  };
  rationale: string;
  tradeoffs: string[];
  /** Which runtime produced the proposal (surfaced in the Glass Box trace). */
  runtime: "agent-engine" | "in-process";
}

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);

function clampSliders(sliders: SliderConfig): SliderConfig {
  return {
    relevance: clamp01(sliders.relevance),
    diversity: clamp01(sliders.diversity),
    novelty: clamp01(sliders.novelty),
    popularity: clamp01(sliders.popularity),
  };
}

/** Re-derive retrieval params with the production math (sql-builder.ts). */
function deriveParams(sliders: SliderConfig): ArchitectProposal["derived"] {
  const params = buildSearchParams(sliders);
  return {
    similarityThreshold: Number(params.similarityThreshold.toFixed(4)),
    candidateLimit: params.limit,
    weights: params.weights,
  };
}

/**
 * Architect Agent (Logic Drift pillar): converts a plain-language business
 * goal into a transparent intent-slider proposal.
 *
 * HYBRID: when the Python ADK agent service is configured, the proposal comes
 * from the Architect pipeline on Vertex AI Agent Engine (a SequentialAgent
 * whose planner grounds itself with the deterministic translate_slider_config
 * tool). Otherwise it falls back to an in-process Gemini call. In BOTH cases
 * the sliders are clamped and the derived retrieval parameters are recomputed
 * here with the same production math, so the proposal can never drift from
 * what the engine will actually execute.
 */
export async function proposeAlignmentFromGoal(
  goal: string,
  context: {
    currentSliders?: SliderConfig;
    catalogSummary?: CatalogSummary;
  } = {}
): Promise<ArchitectProposal> {
  if (isAgentServiceEnabled()) {
    try {
      const remote = await callGlassboxAgent<{
        profileName: string;
        sliders: SliderConfig;
        rationale: string;
        tradeoffs: string[];
      }>("architect", {
        goal,
        ...(context.currentSliders
          ? { currentSliders: context.currentSliders }
          : {}),
        ...(context.catalogSummary
          ? { catalogSummary: context.catalogSummary }
          : {}),
      });

      const sliders = clampSliders(remote.sliders);
      return {
        profileName: remote.profileName || "Architect proposal",
        sliders,
        derived: deriveParams(sliders),
        rationale: remote.rationale ?? "",
        tradeoffs: remote.tradeoffs ?? [],
        runtime: "agent-engine",
      };
    } catch (err) {
      logger.warn(
        { err },
        "Agent service architect call failed; falling back to in-process Gemini"
      );
    }
  }

  const prompt = `You are the GlassBox Architect, a reward-function designer for a transparent recommendation engine. Business users describe goals in plain language; you translate them into four intent sliders (each 0.0-1.0) that steer a deterministic ranking core:

- relevance: how tightly results must match the query/history (high = precise but narrow)
- diversity: how much category spread to force into the feed (high = discovery)
- novelty: how much to boost new/undiscovered inventory (high = unproven items)
- popularity: how much social proof matters (high = trending and safe)

Business goal: ${goal}
${context.currentSliders ? `Current sliders: ${JSON.stringify(context.currentSliders)}` : ""}
${context.catalogSummary ? `Catalog: ${context.catalogSummary.productCount} products across categories ${context.catalogSummary.categories.map((c) => `${c.name} (${c.count})`).join(", ")}` : ""}

Propose slider values that serve this goal. Be honest about tensions in the goal. Return ONLY valid JSON:
{
  "profileName": "<short name, max 5 words>",
  "sliders": { "relevance": <0-1>, "diversity": <0-1>, "novelty": <0-1>, "popularity": <0-1> },
  "rationale": "<2-4 sentences tied to the goal>",
  "tradeoffs": ["<explicit tradeoff>", ...]
}`;

  const response = await genai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: prompt,
    config: { responseMimeType: "application/json" },
  });

  const parsed = JSON.parse(response.text ?? "{}") as {
    profileName?: string;
    sliders?: Partial<SliderConfig>;
    rationale?: string;
    tradeoffs?: string[];
  };
  if (
    !parsed.sliders ||
    typeof parsed.sliders.relevance !== "number" ||
    typeof parsed.sliders.diversity !== "number" ||
    typeof parsed.sliders.novelty !== "number" ||
    typeof parsed.sliders.popularity !== "number"
  ) {
    throw new Error("Architect returned an incomplete slider proposal");
  }

  const sliders = clampSliders(parsed.sliders as SliderConfig);
  return {
    profileName: parsed.profileName || "Architect proposal",
    sliders,
    derived: deriveParams(sliders),
    rationale: parsed.rationale ?? "",
    tradeoffs: parsed.tradeoffs ?? [],
    runtime: "in-process",
  };
}
