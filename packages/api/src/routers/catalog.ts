import { z } from "zod";
import { and, eq, desc, sql, asc } from "drizzle-orm";
import { cosineDistance } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure, rateLimitedProcedure } from "./trpc";
import { catalogSources, products, projects } from "@glassbox/database/schema";
import { ensureProject, resolveProject } from "../project_utils";
import {
  inferCatalogFormat,
  normalizeCatalogItems,
  parseCatalogPayload,
} from "../catalog_import";

const importSourceSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.enum(["csv", "json", "url"]),
  origin: z.string().optional(),
  importedAt: z.string(),
  productCount: z.number().int().nonnegative(),
  format: z.enum(["csv", "json"]),
  metadata: z
    .object({
      autoEmbed: z.boolean().optional(),
      syncStatus: z.enum(["idle", "running", "success", "failed"]).optional(),
      syncMessage: z.string().optional(),
      lastSyncedAt: z.string().optional(),
    })
    .partial()
    .optional(),
});

export const catalogRouter = createTRPCRouter({
  /** List all products with optional search */
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        search: z.string().optional(),
        category: z.string().optional(),
        projectId: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const project = await resolveProject(ctx, input.projectId);
      if (!project) {
        return { items: [], total: 0, hasMore: false };
      }
      const conditions = [
        eq(products.userId, ctx.user.id),
        eq(products.projectId, project.id),
      ];

      if (input.search) {
        conditions.push(
          sql`${products.name} ILIKE ${"%" + input.search + "%"} OR ${products.description} ILIKE ${"%" + input.search + "%"}`
        );
      }
      if (input.category) {
        conditions.push(eq(products.category, input.category));
      }

      const where = and(...conditions);

      const items = await ctx.db
        .select()
        .from(products)
        .where(where)
        .orderBy(desc(products.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const countResult = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(products)
        .where(where);

      return {
        items,
        total: Number(countResult[0]?.count ?? 0),
        hasMore: input.offset + input.limit < Number(countResult[0]?.count ?? 0),
      };
    }),

  /** Get a single product by ID */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.db
        .select()
        .from(products)
        .where(and(eq(products.id, input.id), eq(products.userId, ctx.user.id)))
        .limit(1);

      if (result.length === 0) {
        throw new Error("Product not found");
      }

      return result[0];
    }),

  /** Create a new product */
  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid().optional(),
        name: z.string().min(1),
        description: z.string().optional(),
        category: z.string().optional(),
        externalId: z.string().optional(),
        metadata: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ensureProject(ctx, input.projectId);
      const { projectId: _projectId, ...productInput } = input;
      const result = await ctx.db
        .insert(products)
        .values({
          ...productInput,
          userId: ctx.user.id,
          projectId: project.id,
        })
        .returning();

      return result[0];
    }),

  /** Bulk import products */
  bulkImport: rateLimitedProcedure
    .input(
      z.object({
        projectId: z.string().uuid().optional(),
        items: z.array(
          z.object({
            name: z.string().min(1),
            description: z.string().optional(),
            category: z.string().optional(),
            externalId: z.string().optional(),
            metadata: z.record(z.unknown()).optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ensureProject(ctx, input.projectId);
      const result = await ctx.db
        .insert(products)
        .values(
          input.items.map((item) => ({
            ...item,
            userId: ctx.user.id,
            projectId: project.id,
          }))
        )
        .onConflictDoUpdate({
          target: products.externalId,
          set: {
            name: sql`excluded.name`,
            description: sql`excluded.description`,
            category: sql`excluded.category`,
            metadata: sql`excluded.metadata`,
            updatedAt: new Date(),
          },
        })
        .returning();

      return { imported: result.length };
    }),

  getSources: protectedProcedure
    .input(z.object({ projectId: z.string().uuid().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const project = await resolveProject(ctx, input?.projectId);
      if (!project) return [];
      const rows = await ctx.db
        .select({
          id: catalogSources.id,
          label: catalogSources.label,
          type: catalogSources.sourceType,
          origin: catalogSources.origin,
          importedAt: catalogSources.lastImportedAt,
          productCount: catalogSources.productCount,
          format: catalogSources.format,
        })
        .from(catalogSources)
        .where(
          and(
            eq(catalogSources.userId, ctx.user.id),
            eq(catalogSources.projectId, project.id)
          )
        )
        .orderBy(desc(catalogSources.lastImportedAt));

      return rows
        .map((row) =>
          importSourceSchema.safeParse({
            ...row,
            origin: row.origin ?? undefined,
            importedAt: row.importedAt.toISOString(),
            productCount: Number(row.productCount),
          })
        )
        .flatMap((parsed) => (parsed.success ? [parsed.data] : []));
    }),

  importFeed: rateLimitedProcedure
    .input(
      z.object({
        projectId: z.string().uuid().optional(),
        sourceLabel: z.string().min(1),
        sourceType: z.enum(["csv", "json", "url"]),
        content: z.string().optional(),
        url: z.string().url().optional(),
        format: z.enum(["csv", "json"]).optional(),
        autoEmbed: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ensureProject(ctx, input.projectId);
      return runCatalogImport({
        db: ctx.db,
        userId: ctx.user.id,
        project,
        sourceLabel: input.sourceLabel,
        sourceType: input.sourceType,
        content: input.content,
        url: input.url,
        format: input.format,
        autoEmbed: input.autoEmbed,
      });
    }),

  syncSource: rateLimitedProcedure
    .input(
      z.object({
        projectId: z.string().uuid().optional(),
        sourceId: z.string().uuid(),
        autoEmbed: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ensureProject(ctx, input.projectId);
      const [source] = await ctx.db
        .select()
        .from(catalogSources)
        .where(
          and(
            eq(catalogSources.id, input.sourceId),
            eq(catalogSources.userId, ctx.user.id),
            eq(catalogSources.projectId, project.id)
          )
        )
        .limit(1);

      if (!source) {
        throw new Error("Catalog source not found.");
      }

      if (source.sourceType !== "url" || !source.origin) {
        throw new Error("Only remote feed sources can be refreshed.");
      }

      await ctx.db
        .update(catalogSources)
        .set({
          metadata: {
            ...readSourceMetadata(source.metadata),
            autoEmbed: input.autoEmbed,
            syncStatus: "running",
            syncMessage: "Refreshing remote feed...",
          },
          updatedAt: new Date(),
        })
        .where(eq(catalogSources.id, source.id));

      try {
        return await runCatalogImport({
          db: ctx.db,
          userId: ctx.user.id,
          project,
          sourceLabel: source.label,
          sourceType: "url",
          url: source.origin,
          format:
            source.format === "csv" || source.format === "json"
              ? source.format
              : undefined,
          autoEmbed: input.autoEmbed,
          sourceId: source.id,
        });
      } catch (error) {
        await ctx.db
          .update(catalogSources)
          .set({
            metadata: {
              ...readSourceMetadata(source.metadata),
              autoEmbed: input.autoEmbed,
              syncStatus: "failed",
              syncMessage:
                error instanceof Error
                  ? error.message
                  : "Remote feed refresh failed.",
            },
            updatedAt: new Date(),
          })
          .where(eq(catalogSources.id, source.id));

        throw error;
      }
    }),

  /** Semantic search using pgvector */
  semanticSearch: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid().optional(),
        queryEmbedding: z.array(z.number()),
        limit: z.number().min(1).max(50).default(10),
        threshold: z.number().min(0).max(1).default(0.8),
      })
    )
    .query(async ({ ctx, input }) => {
      const project = await resolveProject(ctx, input.projectId);
      if (!project) return [];
      const distance = sql<number>`(${cosineDistance(
        products.embedding,
        input.queryEmbedding
      )})`;

      const results = await ctx.db
        .select({
          id: products.id,
          name: products.name,
          description: products.description,
          category: products.category,
          metadata: products.metadata,
          similarity: sql<number>`1 - ${distance}`,
        })
        .from(products)
        .where(
          and(
            eq(products.userId, ctx.user.id),
            eq(products.projectId, project.id),
            sql`${distance} < ${1 - input.threshold}`
          )
        )
        .orderBy(asc(distance))
        .limit(input.limit);

      return results;
    }),

  /** Get embedding status (how many products have embeddings) */
  embeddingStatus: protectedProcedure
    .input(z.object({ projectId: z.string().uuid().optional() }).optional())
    .query(async ({ ctx, input }) => {
    const project = await resolveProject(ctx, input?.projectId);
    if (!project) {
      return {
        total: 0,
        withEmbeddings: 0,
        withoutEmbeddings: 0,
        percentage: 0,
      };
    }
    const where = and(
      eq(products.userId, ctx.user.id),
      eq(products.projectId, project.id)
    );

    const total = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(where);

    const withEmbeddings = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(and(where, sql`${products.embedding} IS NOT NULL`));

    return {
      total: Number(total[0]?.count ?? 0),
      withEmbeddings: Number(withEmbeddings[0]?.count ?? 0),
      withoutEmbeddings:
        Number(total[0]?.count ?? 0) - Number(withEmbeddings[0]?.count ?? 0),
      percentage:
        Number(total[0]?.count) > 0
          ? Math.round(
              (Number(withEmbeddings[0]?.count) / Number(total[0]?.count)) * 100
            )
          : 0,
    };
  }),

  /** Get distinct categories */
  categories: protectedProcedure
    .input(z.object({ projectId: z.string().uuid().optional() }).optional())
    .query(async ({ ctx, input }) => {
    const project = await resolveProject(ctx, input?.projectId);
    if (!project) return [];
    const result = await ctx.db
      .selectDistinct({ category: products.category })
      .from(products)
      .where(
        and(
          eq(products.userId, ctx.user.id),
          eq(products.projectId, project.id),
          sql`${products.category} IS NOT NULL`
        )
      )
      .orderBy(asc(products.category));

    return result.map((r) => r.category).filter(Boolean) as string[];
  }),

  /** Generate embeddings for products using the Engineer Agent */
  generateEmbeddings: rateLimitedProcedure
    .input(
      z.object({
        projectId: z.string().uuid().optional(),
        batchSize: z.number().min(1).max(100).default(10),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ensureProject(ctx, input.projectId);
      const { runEngineerAgent } = await import("@glassbox/agents");
      return runEngineerAgent(input.batchSize, ctx.user.id, project.id);
    }),
});

async function fetchRemoteCatalog(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "GlassBox Engine Catalog Importer",
      Accept: "application/json,text/csv,text/plain,*/*",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch remote catalog (${response.status}).`);
  }

  return response.text();
}

function readSourceMetadata(
  metadata: unknown
): {
  autoEmbed?: boolean;
  syncStatus?: "idle" | "running" | "success" | "failed";
  syncMessage?: string;
  lastSyncedAt?: string;
} {
  if (!metadata || typeof metadata !== "object") {
    return {};
  }
  return metadata as {
    autoEmbed?: boolean;
    syncStatus?: "idle" | "running" | "success" | "failed";
    syncMessage?: string;
    lastSyncedAt?: string;
  };
}

async function runCatalogImport(params: {
  db: any;
  userId: string;
  project: { id: string; metadata?: unknown };
  sourceLabel: string;
  sourceType: "csv" | "json" | "url";
  content?: string;
  url?: string;
  format?: "csv" | "json";
  autoEmbed: boolean;
  sourceId?: string;
}) {
  const rawContent =
    params.sourceType === "url"
      ? await fetchRemoteCatalog(params.url!)
      : params.content;

  if (!rawContent?.trim()) {
    throw new Error("Import source was empty.");
  }

  const format = inferCatalogFormat(rawContent, params.format);
  const parsedItems = parseCatalogPayload(rawContent, format);
  const normalizedItems = normalizeCatalogItems({
    items: parsedItems,
    sourceKey: `${params.sourceType}:${params.sourceLabel}`,
  });

  const result = await params.db
    .insert(products)
    .values(
      normalizedItems.map((item) => ({
        userId: params.userId,
        projectId: params.project.id,
        name: item.name,
        description: item.description,
        category: item.category,
        externalId: item.externalId,
        metadata: {
          ...(item.metadata ?? {}),
          sourceLabel: params.sourceLabel,
          sourceType: params.sourceType,
        },
      }))
    )
    .onConflictDoUpdate({
      target: products.externalId,
      set: {
        name: sql`excluded.name`,
        description: sql`excluded.description`,
        category: sql`excluded.category`,
        metadata: sql`excluded.metadata`,
        updatedAt: new Date(),
      },
    })
    .returning();

  const importedAt = new Date().toISOString();
  const sourceEntry = {
    id: params.sourceId ?? crypto.randomUUID(),
    label: params.sourceLabel,
    type: params.sourceType,
    origin: params.url,
    importedAt,
    productCount: result.length,
    format,
  } as const;

  const projectMetadata =
    params.project.metadata && typeof params.project.metadata === "object"
      ? { ...(params.project.metadata as Record<string, unknown>) }
      : {};
  projectMetadata.lastCatalogImportAt = sourceEntry.importedAt;

  await params.db
    .update(projects)
    .set({
      metadata: projectMetadata,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, params.project.id));

  const fingerprint = `${params.project.id}:${params.sourceType}:${params.url ?? params.sourceLabel}`;
  const sourceMetadata = {
    autoEmbed: params.autoEmbed,
    syncStatus: params.sourceType === "url" ? "success" : "idle",
    syncMessage:
      params.sourceType === "url"
        ? `Imported ${result.length} products from remote feed.`
        : "Catalog imported successfully.",
    lastSyncedAt: importedAt,
  } as const;

  await params.db
    .insert(catalogSources)
    .values({
      id: params.sourceId,
      userId: params.userId,
      projectId: params.project.id,
      fingerprint,
      label: params.sourceLabel,
      sourceType: params.sourceType,
      format,
      origin: params.url,
      productCount: result.length,
      lastImportedAt: new Date(sourceEntry.importedAt),
      metadata: sourceMetadata,
    })
    .onConflictDoUpdate({
      target: [catalogSources.projectId, catalogSources.fingerprint],
      set: {
        label: params.sourceLabel,
        sourceType: params.sourceType,
        format,
        origin: params.url,
        productCount: result.length,
        lastImportedAt: new Date(sourceEntry.importedAt),
        metadata: sourceMetadata,
        updatedAt: new Date(),
      },
    });

  let embeddingResult: Awaited<
    ReturnType<typeof import("@glassbox/agents").runEngineerAgent>
  > | null = null;
  if (params.autoEmbed && result.length > 0) {
    const { runEngineerAgent } = await import("@glassbox/agents");
    embeddingResult = await runEngineerAgent(
      result.length,
      params.userId,
      params.project.id
    );
  }

  return {
    imported: result.length,
    format,
    source: sourceEntry,
    embeddingResult,
  };
}
