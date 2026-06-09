import { and, eq, sql } from "drizzle-orm";
import { db } from "@glassbox/database/client";
import { products } from "@glassbox/database/schema";
import {
  generateEmbedding,
  generateEmbeddings,
} from "./embedding-generator";

export interface CatalogScanResult {
  totalProducts: number;
  withEmbeddings: number;
  withoutEmbeddings: number;
  categories: string[];
  newlyEmbedded: number;
}

/**
 * Engineer Agent: Scans the product catalog and generates embeddings
 * for products that don't have them yet.
 */
export async function runEngineerAgent(
  batchSize: number = 10,
  userId?: string,
  projectId?: string
): Promise<CatalogScanResult> {
  const conditions = [sql`${products.embedding} IS NULL`];
  if (userId) conditions.push(eq(products.userId, userId));
  if (projectId) conditions.push(eq(products.projectId, projectId));

  // 1. Get products without embeddings
  const productsWithout = await db
    .select({
      id: products.id,
      name: products.name,
      description: products.description,
      category: products.category,
    })
    .from(products)
    .where(and(...conditions))
    .limit(batchSize);

  // 2. Generate embeddings in batches
  let newlyEmbedded = 0;

  if (productsWithout.length > 0) {
    const texts = productsWithout.map((p) => {
      const parts = [p.name];
      if (p.description) parts.push(p.description);
      if (p.category) parts.push(`Category: ${p.category}`);
      return parts.join(". ");
    });

    const embeddings = await generateEmbeddings(texts);

    // 3. Update products with embeddings
    for (let i = 0; i < productsWithout.length; i++) {
      const embedding = embeddings[i];
      if (embedding && embedding.length > 0) {
        await db
          .update(products)
          .set({ embedding, updatedAt: new Date() })
          .where(eq(products.id, productsWithout[i]!.id));
        newlyEmbedded++;
      }
    }
  }

  // 4. Get final stats
  const totalResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(products)
    .where(
      and(
        ...(userId ? [eq(products.userId, userId)] : []),
        ...(projectId ? [eq(products.projectId, projectId)] : [])
      )
    );

  const embeddedResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(products)
    .where(
      and(
        sql`${products.embedding} IS NOT NULL`,
        ...(userId ? [eq(products.userId, userId)] : []),
        ...(projectId ? [eq(products.projectId, projectId)] : [])
      )
    );

  const categoriesResult = await db
    .selectDistinct({ category: products.category })
    .from(products)
    .where(
      and(
        sql`${products.category} IS NOT NULL`,
        ...(userId ? [eq(products.userId, userId)] : []),
        ...(projectId ? [eq(products.projectId, projectId)] : [])
      )
    );

  const total = Number(totalResult[0]?.count ?? 0);
  const withEmbeddings = Number(embeddedResult[0]?.count ?? 0);

  return {
    totalProducts: total,
    withEmbeddings,
    withoutEmbeddings: total - withEmbeddings,
    categories: categoriesResult
      .map((r) => r.category)
      .filter(Boolean) as string[],
    newlyEmbedded,
  };
}
