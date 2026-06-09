import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  index,
  vector,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id"),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    externalId: text("external_id").unique(),
    name: text("name").notNull(),
    description: text("description"),
    category: text("category"),
    metadata: jsonb("metadata").default({}),
    embedding: vector("embedding", { dimensions: 768 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("products_user_idx").on(table.userId),
    index("products_project_idx").on(table.projectId),
    index("products_embedding_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops")
    ),
    index("products_external_id_idx").on(table.externalId),
    index("products_category_idx").on(table.category),
  ]
);

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
