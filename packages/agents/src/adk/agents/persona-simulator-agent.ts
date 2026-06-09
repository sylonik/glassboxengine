import { LlmAgent } from "@google/adk";
import { DEFAULT_MODEL } from "../../config";
import { toAdkModel } from "../session";
import { catalogLoaderTool } from "../tools/catalog-tool";
import { interactionPersistTool } from "../tools/interaction-persist-tool";
import type { PersonaBehaviorConfig } from "@glassbox/database";

/**
 * Persona Simulator Agent (LlmAgent): Generates synthetic interactions
 * for a persona based on their behavior config and a project's product catalog.
 *
 * Flow:
 * 1. Reads persona config from session state
 * 2. Uses load_product_catalog tool to get available products
 * 3. Generates realistic synthetic interactions
 * 4. Uses persist_simulation_results tool to save to database
 * 5. Writes simulation summary to temp:simulation_result via outputKey
 */
export const personaSimulatorAgent = new LlmAgent({
  name: "persona_simulator",
  description:
    "Generates synthetic user interactions for cold-start simulation and persona testing",
  model: toAdkModel(DEFAULT_MODEL),
  instruction: (context) => {
    const personaId = context.state.get<string>("temp:persona_id") ?? "";
    const personaName =
      context.state.get<string>("temp:persona_name") ?? "Unknown";
    const personaDescription =
      context.state.get<string>("temp:persona_description") ?? "General user";
    const behavior: PersonaBehaviorConfig =
      context.state.get<PersonaBehaviorConfig>("temp:behavior_config") ?? {
        browsingPatterns: ["discovery"],
        priceRange: { min: 0, max: 500 },
        categoryPreferences: [],
        engagementLevel: "medium",
      };
    const userId = context.state.get<string>("temp:user_id") ?? "";
    const projectId = context.state.get<string>("temp:project_id") ?? "";

    const engagementCounts: Record<string, number> = {
      low: 5,
      medium: 15,
      high: 30,
    };
    const maxInteractions =
      engagementCounts[behavior.engagementLevel || "medium"] ?? 15;

    return `You are simulating a synthetic user persona for a recommendation engine cold-start scenario.

Persona: "${personaName}"
Description: ${personaDescription}
Browsing patterns: ${behavior.browsingPatterns?.join(", ") || "discovery"}
Price range: $${behavior.priceRange?.min ?? 0} - $${behavior.priceRange?.max ?? 500}
Category preferences: ${behavior.categoryPreferences?.length ? behavior.categoryPreferences.join(", ") : "open to all categories"}
Engagement level: ${behavior.engagementLevel || "medium"}

Follow these steps:

1. First, use the load_product_catalog tool with userId="${userId}" and projectId="${projectId}" to load available products.

2. Then generate up to ${maxInteractions} realistic synthetic interactions. For each:
   - Pick a product from the catalog by its ID
   - Choose an interaction type: "view", "click", "cart_add", or "purchase"
   - Assign a confidence score (0.0-1.0)
   - Provide brief reasoning

   The interaction funnel should be realistic: more views than clicks, more clicks than cart_adds, more cart_adds than purchases.

3. Finally, use the persist_simulation_results tool to save the interactions with:
   - personaId: "${personaId}"
   - userId: "${userId}"
   - projectId: "${projectId}"
   - interactions: the generated interactions array
   - behaviorSummary: "Categories: ${behavior.categoryPreferences?.join(", ") || "general"}. Price range: $${behavior.priceRange?.min ?? 0}-$${behavior.priceRange?.max ?? 500}. Engagement: ${behavior.engagementLevel || "medium"}"

After persisting, respond with a JSON summary:
{
  "personaId": "${personaId}",
  "interactionCount": <number>,
  "summary": "<brief summary>",
  "interactions": [<the interactions array>]
}`;
  },
  tools: [catalogLoaderTool, interactionPersistTool],
  outputKey: "temp:simulation_result",
  generateContentConfig: {
    responseMimeType: "application/json",
  },
});
