import { eq } from "drizzle-orm";
import { Runner, isFinalResponse, stringifyContent } from "@google/adk";
import { db } from "@glassbox/database/client";
import { personas } from "@glassbox/database/schema";
import type { PersonaBehaviorConfig } from "@glassbox/database";
import { personaSimulatorAgent } from "../agents/persona-simulator-agent";
import { observabilityPlugin } from "../plugins/observability-plugin";
import { getSessionService, generateTraceId, APP_NAME } from "../session";
import type {
  SimulationResult,
  SimulatedInteraction,
} from "../../persona-simulator";
import { genai, DEFAULT_MODEL } from "../../config";

/**
 * Runner for the Persona Simulator Agent.
 * Loads persona data, creates a session, runs the LlmAgent, and extracts results.
 *
 * Preserves the same signature as the legacy runPersonaSimulatorAgent().
 */
export async function runPersonaPipeline(
  personaId: string,
  userId: string,
  projectId: string
): Promise<SimulationResult> {
  const sessionService = getSessionService();
  const traceId = generateTraceId("sim");

  // 1. Load persona
  const [persona] = await db
    .select()
    .from(personas)
    .where(eq(personas.id, personaId))
    .limit(1);

  if (!persona) throw new Error(`Persona ${personaId} not found`);

  const behavior = (persona.behaviorConfig ?? {}) as PersonaBehaviorConfig;

  const session = await sessionService.createSession({
    appName: APP_NAME,
    userId,
    state: {
      "temp:trace_id": traceId,
      "temp:user_id": userId,
      "temp:project_id": projectId,
      "temp:persona_id": personaId,
      "temp:persona_name": persona.name,
      "temp:persona_description": persona.description ?? "General user",
      "temp:behavior_config": behavior,
    },
  });

  const runner = new Runner({
    appName: APP_NAME,
    agent: personaSimulatorAgent,
    sessionService,
    plugins: [observabilityPlugin],
  });

  try {
    let finalText = "";

    for await (const event of runner.runAsync({
      userId,
      sessionId: session.id,
      newMessage: {
        role: "user",
        parts: [
          {
            text: `Simulate interactions for persona "${persona.name}" in project ${projectId}`,
          },
        ],
      },
    })) {
      if (isFinalResponse(event)) {
        finalText = stringifyContent(event);
      }
    }

    // Extract from session state or parse final text
    const updatedSession = await sessionService.getSession({
      appName: APP_NAME,
      userId,
      sessionId: session.id,
    });

    const stateResult = updatedSession?.state["temp:simulation_result"];
    const raw =
      stateResult && typeof stateResult === "object"
        ? (stateResult as Record<string, unknown>)
        : finalText
          ? tryParse(finalText)
          : null;

    // Read the updated persona to get the preference vector
    const [updatedPersona] = await db
      .select({ preferenceVector: personas.preferenceVector })
      .from(personas)
      .where(eq(personas.id, personaId))
      .limit(1);

    const interactions = (raw?.interactions ??
      []) as SimulatedInteraction[];
    const summary =
      (raw?.summary as string) ??
      `${interactions.length} interactions generated for "${persona.name}"`;

    return {
      personaId,
      interactions,
      preferenceVector: updatedPersona?.preferenceVector?.map(Number) ?? [],
      summary,
    };
  } finally {
    await sessionService
      .deleteSession({ appName: APP_NAME, userId, sessionId: session.id })
      .catch(() => {});
  }
}

/**
 * Uses Gemini to generate a structured behaviorConfig from a free-text persona description.
 * Preserves the same signature as the legacy generateBehaviorFromDescription().
 */
export async function generateBehaviorConfig(
  description: string
): Promise<PersonaBehaviorConfig> {
  const prompt = `Given this persona description, generate a structured behavior config for a recommendation engine persona.

Description: "${description}"

Return ONLY valid JSON with:
- "browsingPatterns": array of 2-4 patterns from: "discovery", "comparison", "deal_hunting", "research", "impulse", "brand_loyal", "seasonal"
- "priceRange": { "min": number, "max": number } in dollars
- "categoryPreferences": array of 1-5 product categories this persona would prefer
- "engagementLevel": one of "low", "medium", "high"`;

  try {
    const response = await genai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text ?? "{}";
    const config = JSON.parse(text) as PersonaBehaviorConfig;

    return {
      browsingPatterns: config.browsingPatterns ?? ["discovery", "comparison"],
      priceRange: config.priceRange ?? { min: 0, max: 500 },
      categoryPreferences: config.categoryPreferences ?? [],
      engagementLevel: config.engagementLevel ?? "medium",
    };
  } catch {
    return {
      browsingPatterns: ["discovery", "comparison"],
      priceRange: { min: 0, max: 500 },
      categoryPreferences: [],
      engagementLevel: "medium",
    };
  }
}

function tryParse(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
