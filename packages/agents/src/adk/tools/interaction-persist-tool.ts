import { eq } from "drizzle-orm";
import { FunctionTool } from "@google/adk";
import { z } from "zod";
import { db } from "@glassbox/database/client";
import { personas, syntheticInteractions } from "@glassbox/database/schema";
import { generateEmbedding } from "../../embedding-generator";

/**
 * FunctionTool for persisting synthetic interactions and updating
 * the persona's preference vector after simulation.
 */
export const interactionPersistTool = new FunctionTool({
  name: "persist_simulation_results",
  description:
    "Persist synthetic interactions to the database and generate a preference vector for the persona",
  parameters: z.object({
    personaId: z.string().describe("The persona being simulated"),
    userId: z.string().describe("The owning user"),
    projectId: z.string().describe("The project context"),
    interactions: z
      .array(
        z.object({
          productId: z.string(),
          productName: z.string(),
          interactionType: z.enum(["view", "click", "cart_add", "purchase"]),
          confidence: z.number(),
          reasoning: z.string(),
        })
      )
      .describe("The synthetic interactions to persist"),
    behaviorSummary: z
      .string()
      .describe(
        "Summary of persona behavior config for embedding generation"
      ),
  }),
  execute: async ({
    personaId,
    userId,
    projectId,
    interactions,
    behaviorSummary,
  }) => {
    // 1. Generate preference vector from interaction summary
    const interactedProducts = interactions.map((i) => i.productName);
    const preferenceText = `User who prefers: ${interactedProducts.join(", ")}. ${behaviorSummary}`;
    const preferenceVector = await generateEmbedding(preferenceText);

    // 2. Update persona with preference vector and simulation results
    await db
      .update(personas)
      .set({
        preferenceVector,
        simulationResults: {
          interactionCount: interactions.length,
          simulatedAt: new Date().toISOString(),
          summary: `${interactions.length} interactions generated`,
        },
        updatedAt: new Date(),
      })
      .where(eq(personas.id, personaId));

    // 3. Insert synthetic interactions
    if (interactions.length > 0) {
      await db.insert(syntheticInteractions).values(
        interactions.map((interaction) => ({
          personaId,
          productId: interaction.productId,
          projectId,
          userId,
          interactionType: interaction.interactionType,
          confidence: interaction.confidence,
          reasoning: interaction.reasoning,
        }))
      );
    }

    return {
      persisted: true,
      interactionCount: interactions.length,
      preferenceVectorDimensions: preferenceVector.length,
    } as unknown as Record<string, unknown>;
  },
});
