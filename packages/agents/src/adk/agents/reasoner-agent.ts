import { LlmAgent } from "@google/adk";
import { DEFAULT_MODEL } from "../../config";
import { toAdkModel } from "../session";
import type { ArchitectResult } from "../../architect";

/**
 * Reasoner Agent (LlmAgent): Generates human-readable Glass Box labels
 * explaining why each item was recommended.
 *
 * Reads temp:architect_result from session state (written by ArchitectAgent)
 * and writes reasoning labels to temp:reasoning_labels via outputKey.
 */
export const reasonerAgent = new LlmAgent({
  name: "reasoner",
  description:
    "Generates human-readable Glass Box labels explaining why each item was recommended",
  model: toAdkModel(DEFAULT_MODEL),
  instruction: (context) => {
    const architectResult = context.state.get<ArchitectResult>(
      "temp:architect_result"
    );

    if (!architectResult || !architectResult.rankedFeed?.length) {
      return "No items to generate labels for. Return an empty JSON array: []";
    }

    const itemList = architectResult.rankedFeed
      .map(
        (item, i) =>
          `${i + 1}. "${item.name}" — score: ${item.score.toFixed(3)}, matched signals: ${item.matchedSignals.join(", ") || "composite ranking"}, factors: ${item.scoreBreakdown.map((factor) => `${factor.name}=${factor.weightedValue.toFixed(3)} (${factor.contribution})`).join("; ")}`
      )
      .join("\n");

    return `You are the GlassBox Reasoner. Produce faithful recommendation explanations grounded only in the provided score breakdown.

Context: ${architectResult.searchExplanation}

Items (ranked by score):
${itemList}

For each item, return a JSON array with:
- "itemId": the item id
- "shortLabel": a concise label summarizing the top 1-2 ranking signals
- "detailedReasoning": 1-2 sentences explaining the ranking using only the listed factors and context
- "factors": array of { "name", "weight" (0-1), "contribution" (short phrase) }

Do not invent new factors, product traits, or user behavior.
Return ONLY valid JSON array.`;
  },
  outputKey: "temp:reasoning_labels",
  generateContentConfig: {
    responseMimeType: "application/json",
  },
});
