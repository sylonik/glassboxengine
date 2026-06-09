import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../config", () => ({
  genai: {
    models: {
      embedContent: vi.fn(),
    },
  },
  EMBEDDING_MODEL: "text-embedding-004",
  EMBEDDING_DIMENSIONS: 768,
}));

import { generateEmbedding, generateEmbeddings } from "../embedding-generator";
import { resetCircuitBreaker } from "../circuit-breaker";
import { genai } from "../config";

const mockEmbedContent = vi.mocked(genai.models.embedContent);

describe("generateEmbedding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCircuitBreaker();
  });

  it("returns Gemini embedding on success", async () => {
    const fakeValues = Array.from({ length: 768 }, (_, i) => i / 768);
    mockEmbedContent.mockResolvedValueOnce({
      embeddings: [{ values: fakeValues }],
    } as any);

    const result = await generateEmbedding("test text");
    expect(result).toEqual(fakeValues);
    expect(result).toHaveLength(768);
    expect(mockEmbedContent).toHaveBeenCalledOnce();
  });

  it("returns fallback embedding when API throws", async () => {
    mockEmbedContent.mockRejectedValueOnce(new Error("API down"));

    const result = await generateEmbedding("test text");
    expect(result).toHaveLength(768);
    // Fallback should be deterministic
    const result2 = await generateEmbedding("test text");
    expect(result).toEqual(result2);
  });

  it("returns fallback when embeddings array is empty", async () => {
    mockEmbedContent.mockResolvedValueOnce({
      embeddings: [{ values: [] }],
    } as any);

    const result = await generateEmbedding("test text");
    expect(result).toHaveLength(768);
  });

  it("returns fallback when embeddings field is missing", async () => {
    mockEmbedContent.mockResolvedValueOnce({
      embeddings: undefined,
    } as any);

    const result = await generateEmbedding("test text");
    expect(result).toHaveLength(768);
  });

  it("produces different fallback vectors for different texts", async () => {
    mockEmbedContent.mockRejectedValue(new Error("API down"));

    const result1 = await generateEmbedding("hello world");
    const result2 = await generateEmbedding("goodbye world");
    expect(result1).not.toEqual(result2);
  });

  it("produces values in [-1, 1] range for fallback", async () => {
    mockEmbedContent.mockRejectedValueOnce(new Error("API down"));

    const result = await generateEmbedding("test input");
    for (const val of result) {
      expect(val).toBeGreaterThanOrEqual(-1);
      expect(val).toBeLessThanOrEqual(1);
    }
  });
});

describe("generateEmbeddings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCircuitBreaker();
  });

  it("generates embeddings for multiple texts", async () => {
    const fakeValues = Array.from({ length: 768 }, () => 0.5);
    mockEmbedContent.mockResolvedValue({
      embeddings: [{ values: fakeValues }],
    } as any);

    const results = await generateEmbeddings(["text1", "text2", "text3"]);
    expect(results).toHaveLength(3);
    expect(mockEmbedContent).toHaveBeenCalledTimes(3);
    for (const result of results) {
      expect(result).toHaveLength(768);
    }
  });

  it("handles empty input array", async () => {
    const results = await generateEmbeddings([]);
    expect(results).toEqual([]);
  });
});
