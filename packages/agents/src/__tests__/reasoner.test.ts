import { describe, expect, it } from "vitest";
import { runReasonerAgent } from "../reasoner";

describe("runReasonerAgent", () => {
  it("derives faithful labels from the score breakdown", async () => {
    const result = await runReasonerAgent(
      [
        {
          id: "item-1",
          itemId: "item-1",
          name: "Wireless Headphones",
          description: null,
          category: "Electronics",
          similarity: 0.92,
          score: 0.87,
          confidenceScore: 0.87,
          matchedSignals: ["relevance", "diversity"],
          reasoning: "Ranked using composite score.",
          scoreBreakdown: [
            {
              name: "relevance",
              weight: 0.8,
              rawValue: 0.92,
              weightedValue: 0.736,
              contribution: "92% semantic match",
            },
            {
              name: "diversity",
              weight: 0.4,
              rawValue: 1,
              weightedValue: 0.4,
              contribution: "Introduces category variety",
            },
          ],
        },
      ],
      "Prioritizing highly relevant matches."
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.itemId).toBe("item-1");
    expect(result[0]?.shortLabel).toContain("Relevance");
    expect(result[0]?.detailedReasoning).toContain("0.870");
    expect(result[0]?.factors[0]?.name).toBe("relevance");
  });
});
