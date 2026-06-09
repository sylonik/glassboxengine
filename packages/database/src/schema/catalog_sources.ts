import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";

export const catalogSources = pgTable(
  "catalog_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    fingerprint: text("fingerprint").notNull(),
    label: text("label").notNull(),
    sourceType: text("source_type").notNull(),
    format: text("format").notNull(),
    origin: text("origin"),
    productCount: integer("product_count").notNull().default(0),
    lastImportedAt: timestamp("last_imported_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    metadata: jsonb("metadata").default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("catalog_sources_user_idx").on(table.userId),
    index("catalog_sources_project_idx").on(table.projectId),
    index("catalog_sources_imported_at_idx").on(table.lastImportedAt),
    uniqueIndex("catalog_sources_project_fingerprint_idx").on(
      table.projectId,
      table.fingerprint
    ),
  ]
);

export type CatalogSource = typeof catalogSources.$inferSelect;
export type NewCatalogSource = typeof catalogSources.$inferInsert;
