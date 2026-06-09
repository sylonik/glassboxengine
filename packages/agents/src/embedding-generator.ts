import { genai, EMBEDDING_MODEL, EMBEDDING_DIMENSIONS } from "./config";
import { withCircuitBreaker } from "./circuit-breaker";

function fallbackEmbedding(text: string): number[] {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return Array.from({ length: EMBEDDING_DIMENSIONS }, (_, index) => {
    hash ^= index + 0x9e3779b9;
    hash = Math.imul(hash, 16777619);
    return ((hash >>> 0) / 0xffffffff) * 2 - 1;
  });
}

/**
 * Generate an embedding vector for the given text using Gemini's embedding model.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  return withCircuitBreaker(
    async () => {
      const result = await genai.models.embedContent({
        model: EMBEDDING_MODEL,
        contents: text,
        config: {
          outputDimensionality: EMBEDDING_DIMENSIONS,
        },
      });

      const embedding = result.embeddings?.[0]?.values ?? [];
      if (embedding.length === 0) throw new Error("Empty embedding response");
      return embedding;
    },
    () => fallbackEmbedding(text)
  );
}

/**
 * Batch generate embeddings for multiple texts.
 */
export async function generateEmbeddings(
  texts: string[]
): Promise<number[][]> {
  const results = await Promise.all(
    texts.map((text) => generateEmbedding(text))
  );
  return results;
}
