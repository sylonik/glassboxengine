import {
  pgTable,
  uuid,
  text,
  jsonb,
  vector,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";

export const personas = pgTable(
  "personas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    description: text("description"),
    preferenceVector: vector("preference_vector", { dimensions: 768 }),
    behaviorConfig: jsonb("behavior_config").default({}),
    simulationResults: jsonb("simulation_results"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("personas_user_idx").on(table.userId),
    index("personas_project_idx").on(table.projectId),
  ]
);

export type Persona = typeof personas.$inferSelect;
export type NewPersona = typeof personas.$inferInsert;

/** Behavior config for synthetic persona simulation */
export interface PersonaBehaviorConfig {
  browsingPatterns: string[];
  priceRange: { min: number; max: number };
  categoryPreferences: string[];
  engagementLevel: "low" | "medium" | "high";
}
