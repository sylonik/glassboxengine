import { GoogleGenAI } from "@google/genai";
import { createLogger } from "@glassbox/telemetry";

const logger = createLogger("agents");
const apiKey = process.env.GOOGLE_API_KEY;

if (!apiKey) {
  logger.warn("GOOGLE_API_KEY not set. Agents will not function.");
}

export const genai = new GoogleGenAI({ apiKey: apiKey || "" });

/** Default model for most agent operations */
export const DEFAULT_MODEL = "gemini-2.5-flash";

/** Model for complex reasoning tasks (Architect, Mentor) */
export const REASONING_MODEL = "gemini-2.5-flash";

/**
 * Embedding model for product vectors.
 * text-embedding-004 was retired from the Generative Language API (404 on
 * embedContent); gemini-embedding-001 is the current model. We request 768
 * dimensions (via outputDimensionality) to match the products.embedding
 * vector(768) column + HNSW index. Overridable via env for future migrations.
 */
export const EMBEDDING_MODEL =
  process.env.GLASSBOX_EMBEDDING_MODEL ?? "gemini-embedding-001";
export const EMBEDDING_DIMENSIONS = 768;
