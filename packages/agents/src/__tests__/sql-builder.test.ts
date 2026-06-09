import { describe, it, expect } from "vitest";
import { buildSearchParams, explainSliderTranslation } from "../sql-builder";
import type { SliderConfig } from "@glassbox/database";

describe("buildSearchParams", () => {
  it("computes similarity threshold from relevance slider", () => {
    const sliders: SliderConfig = { relevance: 0, diversity: 0, novelty: 0, popularity: 0 };
    expect(buildSearchParams(sliders).similarityThreshold).toBeCloseTo(0.18);

    sliders.relevance = 1;
    expect(buildSearchParams(sliders).similarityThreshold).toBeCloseTo(0.55);

    sliders.relevance = 0.5;
    expect(buildSearchParams(sliders).similarityThreshold).toBeCloseTo(0.365);
  });

  it("computes limit from diversity slider", () => {
    const sliders: SliderConfig = { relevance: 0, diversity: 0, novelty: 0, popularity: 0 };
    expect(buildSearchParams(sliders).limit).toBe(10);

    sliders.diversity = 1;
    expect(buildSearchParams(sliders).limit).toBe(50);

    sliders.diversity = 0.5;
    expect(buildSearchParams(sliders).limit).toBe(30);
  });

  it("derives calibrated weights that keep relevance dominant", () => {
    const sliders: SliderConfig = { relevance: 0.2, diversity: 0.8, novelty: 0.5, popularity: 0.1 };
    const { weights } = buildSearchParams(sliders);
    expect(weights.similarity).toBeCloseTo(0.56);
    expect(weights.diversity).toBeCloseTo(0.43);
    expect(weights.novelty).toBeCloseTo(0.25);
    expect(weights.popularity).toBeCloseTo(0.102);
    expect(weights.similarity).toBeGreaterThan(weights.diversity);
  });

  it("orders orderByComponents by descending weight", () => {
    const sliders: SliderConfig = { relevance: 0.1, diversity: 0.9, novelty: 0.5, popularity: 0.3 };
    const { orderByComponents } = buildSearchParams(sliders);
    expect(orderByComponents[0]).toBe("embedding_distance ASC"); // relevance remains dominant
    expect(orderByComponents[1]).toBe("category_rank ASC"); // diversity second
    expect(orderByComponents[2]).toBe("created_at DESC"); // novelty third
    expect(orderByComponents[3]).toBe("view_count DESC"); // popularity fourth
  });

  it("handles all sliders at maximum", () => {
    const sliders: SliderConfig = { relevance: 1, diversity: 1, novelty: 1, popularity: 1 };
    const result = buildSearchParams(sliders);
    expect(result.similarityThreshold).toBeCloseTo(0.55);
    expect(result.limit).toBe(50);
    expect(result.orderByComponents).toHaveLength(4);
  });
});

describe("explainSliderTranslation", () => {
  it("returns balanced message when all sliders are mid-range", () => {
    const sliders: SliderConfig = { relevance: 0.5, diversity: 0.5, novelty: 0.5, popularity: 0.5 };
    expect(explainSliderTranslation(sliders)).toBe("Balanced ranking across all dimensions.");
  });

  it("includes high relevance explanation", () => {
    const sliders: SliderConfig = { relevance: 0.9, diversity: 0.5, novelty: 0.5, popularity: 0.5 };
    expect(explainSliderTranslation(sliders)).toContain("Prioritizing highly relevant matches");
  });

  it("includes low relevance explanation", () => {
    const sliders: SliderConfig = { relevance: 0.1, diversity: 0.5, novelty: 0.5, popularity: 0.5 };
    expect(explainSliderTranslation(sliders)).toContain("Relaxing relevance to broaden results");
  });

  it("includes high diversity explanation", () => {
    const sliders: SliderConfig = { relevance: 0.5, diversity: 0.9, novelty: 0.5, popularity: 0.5 };
    expect(explainSliderTranslation(sliders)).toContain("Maximizing category diversity");
  });

  it("includes high novelty explanation", () => {
    const sliders: SliderConfig = { relevance: 0.5, diversity: 0.5, novelty: 0.9, popularity: 0.5 };
    expect(explainSliderTranslation(sliders)).toContain("Boosting new and undiscovered items");
  });

  it("includes high popularity explanation", () => {
    const sliders: SliderConfig = { relevance: 0.5, diversity: 0.5, novelty: 0.5, popularity: 0.9 };
    expect(explainSliderTranslation(sliders)).toContain("Surfacing trending items");
  });

  it("combines multiple explanations with periods", () => {
    const sliders: SliderConfig = { relevance: 0.9, diversity: 0.9, novelty: 0.1, popularity: 0.1 };
    const result = explainSliderTranslation(sliders);
    expect(result).toContain("Prioritizing highly relevant matches");
    expect(result).toContain("Maximizing category diversity");
    expect(result).toContain("Preferring established items");
    expect(result).toContain("Ignoring popularity signals");
    expect(result.endsWith(".")).toBe(true);
  });
});
