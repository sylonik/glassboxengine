import { Runner, isFinalResponse, stringifyContent } from "@google/adk";
import { mentorAgent } from "../agents/mentor-agent";
import { observabilityPlugin } from "../plugins/observability-plugin";
import { getSessionService, generateTraceId, APP_NAME } from "../session";
import type { MentorResult } from "../../mentor";
import type { CodeValidationResult } from "../../code-validator";

/**
 * Runner for the Mentor Agent.
 * Creates a short-lived session, runs the LlmAgent, extracts the MentorResult,
 * and cleans up the session.
 *
 * Preserves the same signature as the legacy runMentorAgent(code).
 */
export async function runMentorPipeline(code: string): Promise<MentorResult> {
  const sessionService = getSessionService();
  const traceId = generateTraceId("mentor");

  const session = await sessionService.createSession({
    appName: APP_NAME,
    userId: "system",
    state: {
      "temp:trace_id": traceId,
      "temp:user_id": "system",
      "temp:code": code,
    },
  });

  const runner = new Runner({
    appName: APP_NAME,
    agent: mentorAgent,
    sessionService,
    plugins: [observabilityPlugin],
  });

  try {
    let finalText = "";

    for await (const event of runner.runAsync({
      userId: "system",
      sessionId: session.id,
      newMessage: {
        role: "user",
        parts: [{ text: `Review this scoring function:\n\`\`\`\n${code}\n\`\`\`` }],
      },
    })) {
      if (isFinalResponse(event)) {
        finalText = stringifyContent(event);
      }
    }

    // Try to extract structured result from outputKey in session state
    const updatedSession = await sessionService.getSession({
      appName: APP_NAME,
      userId: "system",
      sessionId: session.id,
    });

    const stateResult = updatedSession?.state["temp:mentor_result"];

    if (stateResult && typeof stateResult === "object") {
      return normalizeResult(stateResult as Record<string, unknown>);
    }

    // Fallback: parse from the final response text
    if (finalText) {
      try {
        const parsed = JSON.parse(finalText);
        return normalizeResult(parsed);
      } catch {
        // If we can't parse JSON, return a best-effort result
        return {
          approved: false,
          validation: {
            isValid: false,
            issues: [],
            summary: "Unable to parse mentor response",
          },
          dialogue: [finalText],
        };
      }
    }

    return {
      approved: false,
      validation: {
        isValid: false,
        issues: [],
        summary: "Mentor agent produced no output",
      },
      dialogue: ["Mentor agent did not return a response. Please try again."],
    };
  } finally {
    await sessionService
      .deleteSession({
        appName: APP_NAME,
        userId: "system",
        sessionId: session.id,
      })
      .catch(() => {});
  }
}

/** Normalize the raw ADK output into the MentorResult shape expected by tRPC. */
function normalizeResult(raw: Record<string, unknown>): MentorResult {
  const approved = Boolean(raw.approved);
  const validation = (raw.validation ?? {
    isValid: approved,
    issues: [],
    summary: "",
  }) as CodeValidationResult;
  const dialogue = Array.isArray(raw.dialogue)
    ? (raw.dialogue as string[])
    : [];

  return { approved, validation, dialogue };
}
