import { FunctionTool } from "@google/adk";
import { z } from "zod";
import { validateScoringCode } from "../../code-validator";

/**
 * FunctionTool wrapping the existing code-validator.
 * Analyzes JavaScript scoring function code for mathematical errors,
 * security vulnerabilities, and performance issues.
 */
export const codeValidatorTool = new FunctionTool({
  name: "validate_scoring_code",
  description:
    "Analyze JavaScript scoring function code for mathematical errors, security vulnerabilities, and performance issues. Returns validation results with Socratic questions for any issues found.",
  parameters: z.object({
    code: z
      .string()
      .describe("The JavaScript scoring function code to validate"),
  }),
  execute: async ({ code }) => {
    const result = await validateScoringCode(code);
    return result as unknown as Record<string, unknown>;
  },
});
