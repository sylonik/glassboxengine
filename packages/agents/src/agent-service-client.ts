/**
 * Client for the GlassBox Python ADK agent service (Reasoner / Mentor / Persona).
 *
 * This is the TypeScript side of the HYBRID architecture: the deterministic
 * ranking core stays in TS, but the LLM-reasoning agents run in a separate
 * Python ADK app (services/glassbox-agents) that deploys to Vertex AI Agent
 * Engine. When GLASSBOX_AGENT_SERVICE_URL is set, the TS agents delegate the
 * LLM step to that service; otherwise they fall back to the in-process
 * @google/genai calls. Every caller MUST fall back on error so the product
 * keeps working if the agent service is unavailable.
 *
 * Protocol: the ADK FastAPI server (`adk api_server`, also how the app is
 * served on Cloud Run). We create a throwaway session and POST /run with the
 * task envelope as the user message; the Coordinator routes to the right
 * sub-agent, whose `output_schema` makes the final event text pure JSON.
 */
import { createLogger } from "@glassbox/telemetry";

const logger = createLogger("agents:agent-service");

const AGENT_SERVICE_URL = process.env.GLASSBOX_AGENT_SERVICE_URL?.replace(
  /\/$/,
  ""
);
const AGENT_APP_NAME = process.env.GLASSBOX_AGENT_APP_NAME ?? "app";
const AGENT_SERVICE_TIMEOUT_MS = Number(
  process.env.GLASSBOX_AGENT_SERVICE_TIMEOUT_MS ?? "30000"
);

export type GlassboxAgentTask = "reason" | "mentor" | "simulate";

/** True when a remote agent service is configured. */
export function isAgentServiceEnabled(): boolean {
  return Boolean(AGENT_SERVICE_URL);
}

interface AdkPart {
  text?: string;
}
interface AdkEvent {
  content?: { parts?: AdkPart[] };
}

/** Parse JSON that may be wrapped in ```json fences or have leading prose. */
function parseLooseJson<T>(text: string): T {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) return JSON.parse(fenced[1].trim()) as T;
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)) as T;
    }
    throw new Error("Agent service returned non-JSON content");
  }
}

/**
 * Invoke the GlassBox agent service for a single task. Throws on any failure
 * (network, timeout, non-JSON) so callers can fall back to in-process logic.
 */
export async function callGlassboxAgent<T>(
  task: GlassboxAgentTask,
  payload: Record<string, unknown>
): Promise<T> {
  if (!AGENT_SERVICE_URL) {
    throw new Error("GLASSBOX_AGENT_SERVICE_URL is not set");
  }

  const userId = "glassbox-ts";
  const sessionId = `gb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AGENT_SERVICE_TIMEOUT_MS);

  try {
    // 1. Create a throwaway session.
    await fetch(
      `${AGENT_SERVICE_URL}/apps/${AGENT_APP_NAME}/users/${userId}/sessions/${sessionId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
        signal: controller.signal,
      }
    );

    // 2. Run the agent with the task envelope as the user message.
    const runRes = await fetch(`${AGENT_SERVICE_URL}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        app_name: AGENT_APP_NAME,
        user_id: userId,
        session_id: sessionId,
        new_message: {
          role: "user",
          parts: [{ text: JSON.stringify({ task, ...payload }) }],
        },
      }),
    });

    if (!runRes.ok) {
      throw new Error(`Agent service /run returned ${runRes.status}`);
    }

    const events = (await runRes.json()) as AdkEvent[];
    let finalText: string | undefined;
    for (const event of events) {
      for (const part of event.content?.parts ?? []) {
        if (part.text) finalText = part.text;
      }
    }
    if (!finalText) throw new Error("Agent service returned no text content");

    return parseLooseJson<T>(finalText);
  } finally {
    clearTimeout(timer);
  }
}
