import { validateScoringCode, type CodeValidationResult } from "./code-validator";
import {
  callGlassboxAgent,
  isAgentServiceEnabled,
} from "./agent-service-client";
import { createLogger } from "@glassbox/telemetry";

const logger = createLogger("agents:mentor");

export interface MentorResult {
  approved: boolean;
  validation: CodeValidationResult;
  dialogue: string[];
}

/** Shape returned by the Python ADK Mentor agent (services/glassbox-agents). */
interface RemoteMentorOutput {
  isValid: boolean;
  issues: CodeValidationResult["issues"];
  summary: string;
  dialogue: string[];
}

/**
 * Mentor Agent: Reviews scoring function code using Socratic questioning.
 * If issues are found, it blocks the commit and returns guiding questions.
 *
 * HYBRID: when GLASSBOX_AGENT_SERVICE_URL is set, the LLM review runs in the
 * Python ADK agent service (Vertex AI Agent Engine); on any error we fall back
 * to the in-process @google/genai validation below.
 */
export async function runMentorAgent(code: string): Promise<MentorResult> {
  if (isAgentServiceEnabled()) {
    try {
      const remote = await callGlassboxAgent<RemoteMentorOutput>("mentor", {
        code,
      });
      return {
        approved: remote.isValid,
        validation: {
          isValid: remote.isValid,
          issues: remote.issues ?? [],
          summary: remote.summary ?? "",
        },
        dialogue: remote.dialogue ?? [],
      };
    } catch (err) {
      logger.warn(
        { err },
        "Agent service mentor call failed; falling back to in-process validation"
      );
    }
  }

  const validation = await validateScoringCode(code);

  const dialogue: string[] = [];

  if (!validation.isValid) {
    dialogue.push(
      "I reviewed this scorer against GlassBox's production expectations and found a few issues we should fix before committing:"
    );

    for (const issue of validation.issues) {
      if (issue.severity === "error") {
        dialogue.push(`🔴 ${issue.message}`);
        dialogue.push(`   → ${issue.socraticQuestion}`);
      } else if (issue.severity === "warning") {
        dialogue.push(`🟡 ${issue.message}`);
        dialogue.push(`   → ${issue.socraticQuestion}`);
      } else {
        dialogue.push(`💡 ${issue.message}`);
        dialogue.push(`   → ${issue.socraticQuestion}`);
      }
    }

    dialogue.push(
      "",
      "Address these points, then try committing again. The goal is a scorer that is deterministic, auditable, and safe to ship."
    );
  } else {
    dialogue.push(
      "Your scoring function is in good shape for GlassBox's deterministic recommendation flow."
    );
    dialogue.push(
      `Summary: ${validation.summary}`
    );
  }

  return {
    approved: validation.isValid,
    validation,
    dialogue,
  };
}
