import { genai, DEFAULT_MODEL } from "./config";
import { withCircuitBreaker } from "./circuit-breaker";

export interface CodeValidationResult {
  isValid: boolean;
  issues: Array<{
    type: "math" | "security" | "performance";
    severity: "error" | "warning" | "info";
    message: string;
    socraticQuestion: string;
    line?: number;
  }>;
  summary: string;
}

export async function validateScoringCode(
  code: string
): Promise<CodeValidationResult> {
  const prompt = `You are a code review agent for scoring functions in a recommendation engine.
Analyze the following JavaScript scoring function and return a JSON response.

Check for:
1. MATH: Division by zero, NaN propagation, unbounded outputs, missing normalization
2. SECURITY: eval(), new Function(), SQL injection, prototype pollution
3. PERFORMANCE: O(n²) loops, unnecessary copies, missing early returns

For each issue, provide a Socratic question that guides the user to fix it WITHOUT giving the answer.

Return ONLY valid JSON:
{
  "isValid": boolean,
  "issues": [{ "type": "math"|"security"|"performance", "severity": "error"|"warning"|"info", "message": string, "socraticQuestion": string, "line": number|null }],
  "summary": string
}

Code:
\`\`\`javascript
${code}
\`\`\``;

  return withCircuitBreaker(
    async () => {
      const response = await genai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });
      return JSON.parse(response.text ?? "{}") as CodeValidationResult;
    },
    () => ({
      isValid: false,
      issues: [{
        type: "performance" as const,
        severity: "error" as const,
        message: "Code validation service temporarily unavailable",
        socraticQuestion: "Can you check your code syntax and try again?",
      }],
      summary: "Validation could not be completed.",
    })
  );
}
