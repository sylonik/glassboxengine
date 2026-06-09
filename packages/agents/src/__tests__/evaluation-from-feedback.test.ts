import { describe, expect, it } from "vitest";
import { createEvaluationDatasetFromFeedback } from "../evaluation-from-feedback";

describe("evaluation dataset from feedback", () => {
  it("builds behavior-derived scenarios from interaction history", () => {
    const dataset = createEvaluationDatasetFromFeedback(
      {
        datasetName: "feedback-derived-test",
        products: [
          { id: "p1", name: "Wireless Headphones", category: "audio", createdAt: "2026-01-01" },
          { id: "p2", name: "Noise Cancelling Earbuds", category: "audio", createdAt: "2026-02-01" },
          { id: "p3", name: "Portable DAC", category: "accessories", createdAt: "2026-03-01" },
          { id: "p4", name: "Desk Lamp", category: "home", createdAt: "2025-01-01" },
          { id: "p5", name: "Travel Backpack", category: "bags", createdAt: "2026-04-01" },
        ],
        feedbackEvents: [
          { endUserId: "user-a", productId: "p1", eventType: "click", createdAt: "2026-05-01" },
          { endUserId: "user-a", productId: "p1", eventType: "purchase", createdAt: "2026-05-02" },
          { endUserId: "user-a", productId: "p2", eventType: "cart_add", createdAt: "2026-05-03" },
          { endUserId: "user-a", productId: "p3", eventType: "click", createdAt: "2026-05-04" },
          { endUserId: "user-b", productId: "p4", eventType: "view", createdAt: "2026-05-05" },
        ],
        recommendationEvents: [
          {
            endUserId: "user-a",
            sliders: { relevance: 0.91, diversity: 0.44, novelty: 0.62, popularity: 0.31 },
            createdAt: "2026-05-04",
          },
        ],
      },
      { minRelevantEvents: 2, maxCandidates: 5 }
    );

    expect(dataset.name).toBe("feedback-derived-test");
    expect(dataset.scenarios).toHaveLength(1);
    expect(dataset.scenarios[0]?.relevantIds).toEqual(["p1", "p2", "p3"]);
    expect(dataset.scenarios[0]?.expectedTopIds).toEqual(["p1", "p2"]);
    expect(dataset.scenarios[0]?.sliders.relevance).toBe(0.91);
    expect(dataset.scenarios[0]?.candidates).toHaveLength(5);
  });

  it("drops users without enough strong positive interactions", () => {
    const dataset = createEvaluationDatasetFromFeedback(
      {
        datasetName: "feedback-derived-test",
        products: [
          { id: "p1", name: "Desk Lamp", category: "home", createdAt: "2026-01-01" },
          { id: "p2", name: "Floor Lamp", category: "home", createdAt: "2026-02-01" },
        ],
        feedbackEvents: [
          { endUserId: "user-a", productId: "p1", eventType: "view", createdAt: "2026-05-01" },
          { endUserId: "user-a", productId: "p2", eventType: "view", createdAt: "2026-05-01" },
        ],
      },
      { minRelevantEvents: 2 }
    );

    expect(dataset.scenarios).toEqual([]);
  });
});
