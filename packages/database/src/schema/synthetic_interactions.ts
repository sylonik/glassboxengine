import {
  pgTable,
  uuid,
  text,
  real,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { personas } from "./personas";
import { products } from "./products";

export const syntheticInteractions = pgTable(
  "synthetic_interactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    personaId: uuid("persona_id")
      .notNull()
      .references(() => personas.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    userId: text("user_id").notNull(),
    interactionType: text("interaction_type").notNull(), // view, click, cart_add, purchase
    confidence: real("confidence").notNull(), // 0-1
    reasoning: text("reasoning"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("synth_interactions_persona_idx").on(table.personaId),
    index("synth_interactions_product_idx").on(table.productId),
    index("synth_interactions_project_idx").on(table.projectId),
    index("synth_interactions_user_idx").on(table.userId),
  ]
);

export type SyntheticInteraction = typeof syntheticInteractions.$inferSelect;
export type NewSyntheticInteraction = typeof syntheticInteractions.$inferInsert;
