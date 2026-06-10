import { validateScoringCode, type CodeValidationResult } from "./code-validator";
import {
  callGlassboxAgent,
  isAgentServiceEnabled,
} from "./agent-service-client";
import { genai, DEFAULT_MODEL } from "./config";
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

export interface MentorDialogueTurn {
  reply: string;
  followUpQuestion: string | null;
  readyToCommit: boolean;
}

/**
 * One Socratic dialogue turn after a blocked commit: the engineer answers the
 * Mentor's question, the Mentor evaluates the reasoning and either deepens the
 * dialogue or signals they are ready to fix and re-commit.
 *
 * HYBRID: runs on the Python ADK mentor_chat agent (Vertex AI Agent Engine)
 * when configured, with an in-process Gemini fallback.
 */
export async function runMentorDialogue(
  code: string,
  transcript: string[],
  message: string
): Promise<MentorDialogueTurn> {
  if (isAgentServiceEnabled()) {
    try {
      const remote = await callGlassboxAgent<MentorDialogueTurn>(
        "mentor_chat",
        { code, transcript, message }
      );
      return {
        reply: remote.reply ?? "",
        followUpQuestion: remote.followUpQuestion ?? null,
        readyToCommit: Boolean(remote.readyToCommit),
      };
    } catch (err) {
      logger.warn(
        { err },
        "Agent service mentor_chat call failed; falling back to in-process Gemini"
      );
    }
  }

  const prompt = `You are the GlassBox Mentor Agent continuing a Socratic dialogue about a recommendation-engine scoring function whose commit was blocked.

The current scoring function:
\`\`\`javascript
${code}
\`\`\`

Dialogue so far:
${transcript.map((line) => `  ${line}`).join("\n")}

The engineer's latest reply:
"${message}"

Respond as a senior engineer mentoring a junior — one turn, 2-4 sentences:
- If their reasoning is correct, say specifically WHAT they got right and why it matters in production.
- If they are wrong or partially right, name the misconception and ask a sharper question. Do not just give the answer.
- NEVER write the corrected code for them.

Return ONLY valid JSON: { "reply": string, "followUpQuestion": string|null, "readyToCommit": boolean } where readyToCommit is true only when their reasoning shows they can fix the code on their own.`;

  const response = await genai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: prompt,
    config: { responseMimeType: "application/json" },
  });

  const parsed = JSON.parse(response.text ?? "{}") as Partial<MentorDialogueTurn>;
  if (!parsed.reply) {
    throw new Error("Mentor dialogue returned an empty reply");
  }
  return {
    reply: parsed.reply,
    followUpQuestion: parsed.followUpQuestion ?? null,
    readyToCommit: Boolean(parsed.readyToCommit),
  };
}
