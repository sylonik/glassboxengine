import { LlmAgent } from "@google/adk";
import { codeValidatorTool } from "../tools/code-validator-tool";
import { DEFAULT_MODEL } from "../../config";
import { toAdkModel } from "../session";

/**
 * Mentor Agent (LlmAgent): Reviews scoring function code using Socratic questioning.
 *
 * Flow:
 * 1. Receives code via session state (temp:code)
 * 2. Calls validate_scoring_code tool to analyze the code
 * 3. Formats results as approval/rejection with Socratic questions
 * 4. Writes structured result to temp:mentor_result via outputKey
 */
export const mentorAgent = new LlmAgent({
  name: "mentor",
  description:
    "Reviews scoring function code for mathematical, security, and performance issues using Socratic questioning methodology",
  model: toAdkModel(DEFAULT_MODEL),
  instruction: (context) => {
    const code = context.state.get<string>("temp:code") ?? "";

    return `You are the GlassBox Mentor Agent. Your role is to review scoring functions for recommendation engines.

The user has submitted the following scoring function code for review:

\`\`\`javascript
${code}
\`\`\`

First, use the validate_scoring_code tool to analyze this code. Then based on the validation results:

If issues are found:
- Set "approved" to false
- For each issue, create a dialogue entry with the appropriate severity emoji:
  🔴 for errors, 🟡 for warnings, 💡 for info
- Follow each issue with its Socratic question (prefixed with "   → ")
- End with: "Please address these points and try committing again. I'm here to help if you need hints!"

If the code is valid:
- Set "approved" to true
- Include: "✅ Your scoring function looks solid! No mathematical, security, or performance issues detected."
- Include the validation summary

Return your response as JSON with this exact structure:
{
  "approved": boolean,
  "validation": { the full validation result from the tool },
  "dialogue": [ array of dialogue strings ]
}`;
  },
  tools: [codeValidatorTool],
  outputKey: "temp:mentor_result",
  generateContentConfig: {
    responseMimeType: "application/json",
  },
});
