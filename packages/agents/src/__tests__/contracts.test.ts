import { describe, expect, it } from "vitest";
import { createPolicySpec, normalizeSliderConfig } from "../contracts";

describe("recommendation contracts", () => {
  it("normalizes missing slider values", () => {
    expect(normalizeSliderConfig({ relevance: 1 })).toEqual({
      relevance: 1,
      diversity: 0.5,
      novelty: 0.5,
      popularity: 0.5,
    });
  });

  it("builds a policy spec with constraints", () => {
    const policy = createPolicySpec({
      sliders: {
        relevance: 0.8,
        diversity: 0.4,
        novelty: 0.3,
        popularity: 0.6,
      },
      author: "user-1",
      category: "Electronics",
      limit: 12,
      createdAt: new Date("2026-05-16T00:00:00.000Z"),
    });

    expect(policy.version).toContain("policy_2026-05-16T00-00-00-000Z");
    expect(policy.constraints).toHaveLength(2);
    expect(policy.constraints[0]?.type).toBe("category_filter");
    expect(policy.constraints[1]?.type).toBe("candidate_limit");
  });
});
