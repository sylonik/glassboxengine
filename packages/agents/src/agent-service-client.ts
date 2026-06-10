/**
 * Client for the GlassBox Python ADK agent service (Reasoner / Mentor / Persona).
 *
 * This is the TypeScript side of the HYBRID architecture: the deterministic
 * ranking core stays in TS, but the LLM-reasoning agents run in a separate
 * Python ADK app (services/glassbox-agents). Two transports are supported:
 *
 *  1. Vertex AI Agent Engine (PRODUCTION) — set GLASSBOX_AGENT_ENGINE to the
 *     full reasoning engine resource name
 *     (projects/<p>/locations/<l>/reasoningEngines/<id>). Auth uses Application
 *     Default Credentials (the Cloud Run runtime SA in prod, gcloud ADC
 *     locally), so no API key is shipped. We create a managed session via
 *     :query {class_method: "create_session"} and then :streamQuery
 *     {class_method: "stream_query"}.
 *
 *  2. ADK FastAPI server (LOCAL DEV) — set GLASSBOX_AGENT_SERVICE_URL to an
 *     `adk api_server` URL. We create a throwaway session and POST /run.
 *
 * In both cases the task envelope is sent as the user message; the Coordinator
 * routes to the right sub-agent, whose `output_schema` makes the final event
 * text pure JSON. Every caller MUST fall back on error so the product keeps
 * working if the agent service is unavailable.
 */
import { GoogleAuth } from "google-auth-library";
import { createLogger } from "@glassbox/telemetry";

const logger = createLogger("agents:agent-service");

const AGENT_SERVICE_URL = process.env.GLASSBOX_AGENT_SERVICE_URL?.replace(
  /\/$/,
  ""
);
/** Full resource name: projects/<p>/locations/<l>/reasoningEngines/<id>. */
const AGENT_ENGINE = process.env.GLASSBOX_AGENT_ENGINE;
const AGENT_APP_NAME = process.env.GLASSBOX_AGENT_APP_NAME ?? "app";
const AGENT_SERVICE_TIMEOUT_MS = Number(
  process.env.GLASSBOX_AGENT_SERVICE_TIMEOUT_MS ?? "45000"
);

export type GlassboxAgentTask = "reason" | "mentor" | "simulate" | "architect";

/** True when a remote agent service (Agent Engine or local ADK) is configured. */
export function isAgentServiceEnabled(): boolean {
  return Boolean(AGENT_ENGINE || AGENT_SERVICE_URL);
}

/** Which transport the client will use; surfaced for health/debug endpoints. */
export function agentServiceTransport(): "agent-engine" | "http" | "none" {
  if (AGENT_ENGINE) return "agent-engine";
  if (AGENT_SERVICE_URL) return "http";
  return "none";
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
  if (AGENT_ENGINE) {
    return callAgentEngine<T>(task, payload);
  }
  if (AGENT_SERVICE_URL) {
    return callHttpAgentService<T>(task, payload);
  }
  throw new Error(
    "Neither GLASSBOX_AGENT_ENGINE nor GLASSBOX_AGENT_SERVICE_URL is set"
  );
}

// ---------------------------------------------------------------------------
// Transport 1: Vertex AI Agent Engine (prod)
// ---------------------------------------------------------------------------

let auth: GoogleAuth | undefined;

async function getAccessToken(): Promise<string> {
  auth ??= new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const token = await auth.getAccessToken();
  if (!token) throw new Error("Failed to obtain Google Cloud access token");
  return token;
}

function agentEngineBaseUrl(resource: string): string {
  const location = resource.match(/locations\/([^/]+)/)?.[1];
  if (!location) {
    throw new Error(
      `GLASSBOX_AGENT_ENGINE must be a full resource name (projects/<p>/locations/<l>/reasoningEngines/<id>), got: ${resource}`
    );
  }
  return `https://${location}-aiplatform.googleapis.com/v1/${resource}`;
}

/**
 * The :streamQuery response body is a stream of JSON event objects (one per
 * chunk, possibly pretty-printed across lines). Accumulate lines into a buffer
 * and emit an event whenever the buffer parses as JSON.
 *
 * Exported for tests only.
 */
export function parseStreamedEvents(body: string): AdkEvent[] {
  const events: AdkEvent[] = [];
  let buffer = "";
  for (const rawLine of body.split("\n")) {
    // Tolerate SSE framing ("data: {...}") in case the endpoint serves it.
    const line = rawLine.startsWith("data:") ? rawLine.slice(5) : rawLine;
    if (!line.trim() && !buffer) continue;
    buffer += (buffer ? "\n" : "") + line;
    try {
      const parsed = JSON.parse(buffer) as AdkEvent | AdkEvent[];
      events.push(...(Array.isArray(parsed) ? parsed : [parsed]));
      buffer = "";
    } catch {
      // Incomplete JSON — keep accumulating.
    }
  }
  return events;
}

async function callAgentEngine<T>(
  task: string,
  payload: Record<string, unknown>
): Promise<T> {
  const base = agentEngineBaseUrl(AGENT_ENGINE!);
  const token = await getAccessToken();
  const userId = "glassbox-ts";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AGENT_SERVICE_TIMEOUT_MS);
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  try {
    // 1. Create a managed session (the Agent Engine SessionService requires one).
    const sessionRes = await fetch(`${base}:query`, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        class_method: "create_session",
        input: { user_id: userId },
      }),
    });
    if (!sessionRes.ok) {
      throw new Error(
        `Agent Engine create_session returned ${sessionRes.status}: ${(await sessionRes.text()).slice(0, 300)}`
      );
    }
    const sessionJson = (await sessionRes.json()) as {
      output?: { id?: string };
    };
    const sessionId = sessionJson.output?.id;
    if (!sessionId) {
      throw new Error("Agent Engine create_session returned no session id");
    }

    // 2. Stream the task through the Coordinator.
    const runRes = await fetch(`${base}:streamQuery`, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        class_method: "stream_query",
        input: {
          message: JSON.stringify({ task, ...payload }),
          user_id: userId,
          session_id: sessionId,
        },
      }),
    });
    if (!runRes.ok) {
      throw new Error(
        `Agent Engine stream_query returned ${runRes.status}: ${(await runRes.text()).slice(0, 300)}`
      );
    }

    const events = parseStreamedEvents(await runRes.text());
    let finalText: string | undefined;
    for (const event of events) {
      for (const part of event.content?.parts ?? []) {
        if (part.text) finalText = part.text;
      }
    }
    if (!finalText) throw new Error("Agent Engine returned no text content");

    logger.debug({ task, events: events.length }, "Agent Engine call complete");
    return parseLooseJson<T>(finalText);
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Transport 2: ADK FastAPI server (local dev)
// ---------------------------------------------------------------------------

async function callHttpAgentService<T>(
  task: string,
  payload: Record<string, unknown>
): Promise<T> {
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
