import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../config", () => ({
  genai: {
    models: {
      generateContent: vi.fn(),
    },
  },
  DEFAULT_MODEL: "gemini-2.5-flash",
}));

import { validateScoringCode } from "../code-validator";
import { genai } from "../config";

const mockGenerateContent = vi.mocked(genai.models.generateContent);

describe("validateScoringCode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns parsed validation result on success", async () => {
    const mockResponse = {
      isValid: true,
      issues: [],
      summary: "Code looks good.",
    };

    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify(mockResponse),
    } as any);

    const result = await validateScoringCode("function score(item) { return item.price; }");
    expect(result.isValid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.summary).toBe("Code looks good.");
  });

  it("returns issues when code has problems", async () => {
    const mockResponse = {
      isValid: false,
      issues: [
        {
          type: "math",
          severity: "error",
          message: "Possible division by zero",
          socraticQuestion: "What happens when the denominator is zero?",
          line: 3,
        },
      ],
      summary: "Found 1 issue.",
    };

    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify(mockResponse),
    } as any);

    const result = await validateScoringCode("function score(item) { return 1 / item.count; }");
    expect(result.isValid).toBe(false);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]!.type).toBe("math");
    expect(result.issues[0]!.socraticQuestion).toBeTruthy();
  });

  it("returns error fallback when API throws", async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error("Rate limited"));

    const result = await validateScoringCode("function score(item) { return 1; }");
    expect(result.isValid).toBe(false);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]!.severity).toBe("error");
    expect(result.summary).toBe("Validation could not be completed.");
  });

  it("sends code in the prompt to the model", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({ isValid: true, issues: [], summary: "OK" }),
    } as any);

    await validateScoringCode("const x = 42;");

    expect(mockGenerateContent).toHaveBeenCalledOnce();
    const callArgs = mockGenerateContent.mock.calls[0]![0] as any;
    expect(callArgs.contents).toContain("const x = 42;");
    expect(callArgs.config.responseMimeType).toBe("application/json");
  });
});
