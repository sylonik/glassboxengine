import { and, eq, isNotNull } from "drizzle-orm";
import { FunctionTool } from "@google/adk";
import { z } from "zod";
import { db } from "@glassbox/database/client";
import { products } from "@glassbox/database/schema";

/**
 * FunctionTool for loading products with embeddings from a project's catalog.
 * Used by the Persona Simulator to get available products for interaction generation.
 */
export const catalogLoaderTool = new FunctionTool({
  name: "load_product_catalog",
  description:
    "Load products with embeddings from a project's catalog for persona simulation",
  parameters: z.object({
    userId: z.string().describe("The user who owns the catalog"),
    projectId: z.string().describe("The project to load products from"),
    limit: z
      .number()
      .optional()
      .default(100)
      .describe("Maximum products to return"),
  }),
  execute: async ({ userId, projectId, limit }) => {
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
      .limit(limit ?? 100);

    return { products: catalog, count: catalog.length } as unknown as Record<
      string,
      unknown
    >;
  },
});
