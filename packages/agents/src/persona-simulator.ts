import { and, eq, sql, isNotNull } from "drizzle-orm";
import { db } from "@glassbox/database/client";
import {
  products,
  personas,
  syntheticInteractions,
  auditLogs,
} from "@glassbox/database/schema";
import type { PersonaBehaviorConfig } from "@glassbox/database";
import { generateEmbedding } from "./embedding-generator";
import { genai, DEFAULT_MODEL } from "./config";

export interface SimulatedInteraction {
  productId: string;
  productName: string;
  interactionType: "view" | "click" | "cart_add" | "purchase";
  confidence: number;
  reasoning: string;
}

export interface SimulationResult {
  personaId: string;
  interactions: SimulatedInteraction[];
  preferenceVector: number[];
  summary: string;
}

/**
 * Persona Simulator Agent: Generates synthetic interactions for a persona
 * based on their behavior config and the project's product catalog.
 * Logs every step to audit_logs for Glass Box traceability.
 */
export async function runPersonaSimulatorAgent(
  personaId: string,
  userId: string,
  projectId: string
): Promise<SimulationResult> {
  const traceId = `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // 1. Load persona
  const [persona] = await db
    .select()
    .from(personas)
    .where(eq(personas.id, personaId))
    .limit(1);

  if (!persona) throw new Error(`Persona ${personaId} not found`);

  const behavior = (persona.behaviorConfig ?? {}) as PersonaBehaviorConfig;

  await db.insert(auditLogs).values({
    userId,
    projectId,
    action: "simulation.start",
    agentName: "PersonaSimulator",
    reasoning: `Starting simulation for persona "${persona.name}" with engagement=${behavior.engagementLevel}, patterns=[${behavior.browsingPatterns?.join(", ")}]`,
    traceId,
    metadata: { personaId, behaviorConfig: behavior },
  });

  // 2. Load products with embeddings from the project
  const catalog = await db
    .select({
      id: products.id,
      name: products.name,
      description: products.description,
      category: products.category,
      metadata: products.metadata,
    })
    .from(products)
    .where(
      and(
        eq(products.userId, userId),
        eq(products.projectId, projectId),
        isNotNull(products.embedding)
      )
    )
    .limit(100);

  if (catalog.length === 0) {
    await db.insert(auditLogs).values({
      userId,
      projectId,
      action: "simulation.error",
      agentName: "PersonaSimulator",
      reasoning: "No products with embeddings found. Run embedding generation first.",
      traceId,
    });
    throw new Error("No products with embeddings in catalog. Generate embeddings first.");
  }

  // 3. Use Gemini to simulate interactions
  const interactions = await generateInteractions(persona, behavior, catalog, traceId, userId, projectId);

  // 4. Log interactions
  await db.insert(auditLogs).values({
    userId,
    projectId,
    action: "simulation.interactions_generated",
    agentName: "PersonaSimulator",
    reasoning: `Generated ${interactions.length} synthetic interactions across ${new Set(interactions.map((i) => i.interactionType)).size} interaction types`,
    traceId,
    metadata: {
      interactionCount: interactions.length,
      breakdown: {
        view: interactions.filter((i) => i.interactionType === "view").length,
        click: interactions.filter((i) => i.interactionType === "click").length,
        cart_add: interactions.filter((i) => i.interactionType === "cart_add").length,
        purchase: interactions.filter((i) => i.interactionType === "purchase").length,
      },
    },
  });

  // 5. Generate preference vector from interacted products
  const interactedProducts = interactions.map((i) => i.productName);
  const preferenceText = `User who prefers: ${interactedProducts.join(", ")}. Categories: ${behavior.categoryPreferences?.join(", ") || "general"}. Price range: $${behavior.priceRange?.min ?? 0}-$${behavior.priceRange?.max ?? 500}. Engagement: ${behavior.engagementLevel}`;
  const preferenceVector = await generateEmbedding(preferenceText);

  await db.insert(auditLogs).values({
    userId,
    projectId,
    action: "simulation.vector_generated",
    agentName: "PersonaSimulator",
    reasoning: `Generated 768-dim preference vector from ${interactedProducts.length} interacted products`,
    traceId,
  });

  // 6. Persist: update persona + insert synthetic interactions
  await db
    .update(personas)
    .set({
      preferenceVector,
      simulationResults: {
        traceId,
        interactionCount: interactions.length,
        simulatedAt: new Date().toISOString(),
        summary: `${interactions.length} interactions generated`,
      },
      updatedAt: new Date(),
    })
    .where(eq(personas.id, personaId));

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

  const summary = `Simulated ${interactions.length} interactions for "${persona.name}": ${interactions.filter((i) => i.interactionType === "purchase").length} purchases, ${interactions.filter((i) => i.interactionType === "cart_add").length} cart adds, ${interactions.filter((i) => i.interactionType === "click").length} clicks, ${interactions.filter((i) => i.interactionType === "view").length} views.`;

  await db.insert(auditLogs).values({
    userId,
    projectId,
    action: "simulation.complete",
    agentName: "PersonaSimulator",
    reasoning: summary,
    traceId,
    metadata: { personaId, interactionCount: interactions.length },
  });

  return {
    personaId,
    interactions,
    preferenceVector,
    summary,
  };
}

/**
 * Uses Gemini to generate realistic synthetic interactions for a persona.
 */
async function generateInteractions(
  persona: { id: string; name: string; description: string | null },
  behavior: PersonaBehaviorConfig,
  catalog: Array<{
    id: string;
    name: string;
    description: string | null;
    category: string | null;
    metadata: unknown;
  }>,
  traceId: string,
  userId: string,
  projectId: string
): Promise<SimulatedInteraction[]> {
  const engagementCounts = {
    low: { maxInteractions: 5 },
    medium: { maxInteractions: 15 },
    high: { maxInteractions: 30 },
  };
  const maxInteractions = engagementCounts[behavior.engagementLevel || "medium"].maxInteractions;

  const prompt = `You are simulating a synthetic user persona for a recommendation engine cold-start scenario.

Persona: "${persona.name}"
Description: ${persona.description || "General user"}
Browsing patterns: ${behavior.browsingPatterns?.join(", ") || "discovery"}
Price range: $${behavior.priceRange?.min ?? 0} - $${behavior.priceRange?.max ?? 500}
Category preferences: ${behavior.categoryPreferences?.length ? behavior.categoryPreferences.join(", ") : "open to all categories"}
Engagement level: ${behavior.engagementLevel || "medium"}

Product catalog (${catalog.length} items):
${catalog
  .map(
    (p, i) =>
      `${i + 1}. [${p.id}] "${p.name}" — ${p.category ?? "uncategorized"}: ${(p.description ?? "").slice(0, 80)}`
  )
  .join("\n")}

Generate up to ${maxInteractions} realistic synthetic interactions this persona would have. For each interaction:
- Pick a product from the catalog by its ID
- Choose an interaction type: "view", "click", "cart_add", or "purchase"
- Assign a confidence score (0.0-1.0) for how likely this persona is to perform this action
- Provide brief reasoning explaining why this persona would interact with this product

The interaction funnel should be realistic: more views than clicks, more clicks than cart_adds, more cart_adds than purchases. Consider the persona's price range, category preferences, and browsing patterns.

Return ONLY a valid JSON array of objects with: "productId", "productName", "interactionType", "confidence", "reasoning"`;

  try {
    const response = await genai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text ?? "[]";
    const raw = JSON.parse(text) as SimulatedInteraction[];

    // Validate product IDs exist in catalog
    const catalogIds = new Set(catalog.map((p) => p.id));
    const validated = raw.filter(
      (interaction) =>
        catalogIds.has(interaction.productId) &&
        ["view", "click", "cart_add", "purchase"].includes(interaction.interactionType) &&
        typeof interaction.confidence === "number" &&
        interaction.confidence >= 0 &&
        interaction.confidence <= 1
    );

    // Log each product match for traceability
    for (const interaction of validated) {
      await db.insert(auditLogs).values({
        userId,
        projectId,
        action: "simulation.product_match",
        agentName: "PersonaSimulator",
        reasoning: `${interaction.interactionType} on "${interaction.productName}" (confidence: ${interaction.confidence.toFixed(2)}): ${interaction.reasoning}`,
        traceId,
        confidenceScore: interaction.confidence,
        metadata: {
          productId: interaction.productId,
          interactionType: interaction.interactionType,
        },
      });
    }

    return validated;
  } catch {
    // Fallback: generate basic interactions from category matching
    const matching = catalog.filter(
      (p) =>
        !behavior.categoryPreferences?.length ||
        behavior.categoryPreferences.some(
          (cat) => p.category?.toLowerCase().includes(cat.toLowerCase())
        )
    );

    const fallback = matching.slice(0, Math.min(5, matching.length));
    return fallback.map((p) => ({
      productId: p.id,
      productName: p.name,
      interactionType: "view" as const,
      confidence: 0.5,
      reasoning: `Fallback: category match for ${p.category ?? "general"}`,
    }));
  }
}

/**
 * Uses Gemini to generate a structured behaviorConfig from a free-text persona description.
 */
export async function generateBehaviorFromDescription(
  description: string
): Promise<PersonaBehaviorConfig> {
  const prompt = `Given this persona description, generate a structured behavior config for a recommendation engine persona.

Description: "${description}"

Return ONLY valid JSON with:
- "browsingPatterns": array of 2-4 patterns from: "discovery", "comparison", "deal_hunting", "research", "impulse", "brand_loyal", "seasonal"
- "priceRange": { "min": number, "max": number } in dollars
- "categoryPreferences": array of 1-5 product categories this persona would prefer
- "engagementLevel": one of "low", "medium", "high"`;

  try {
    const response = await genai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text ?? "{}";
    const config = JSON.parse(text) as PersonaBehaviorConfig;

    return {
      browsingPatterns: config.browsingPatterns ?? ["discovery", "comparison"],
      priceRange: config.priceRange ?? { min: 0, max: 500 },
      categoryPreferences: config.categoryPreferences ?? [],
      engagementLevel: config.engagementLevel ?? "medium",
    };
  } catch {
    return {
      browsingPatterns: ["discovery", "comparison"],
      priceRange: { min: 0, max: 500 },
      categoryPreferences: [],
      engagementLevel: "medium",
    };
  }
}
