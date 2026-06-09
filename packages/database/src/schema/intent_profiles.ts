import {
  pgTable,
  uuid,
  text,
  jsonb,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";

export const intentProfiles = pgTable(
  "intent_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    sliders: jsonb("sliders").notNull().default({
      relevance: 0.5,
      diversity: 0.5,
      novelty: 0.5,
      popularity: 0.5,
    }),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("intent_profiles_user_idx").on(table.userId),
    index("intent_profiles_project_idx").on(table.projectId),
  ]
);

export type IntentProfile = typeof intentProfiles.$inferSelect;
export type NewIntentProfile = typeof intentProfiles.$inferInsert;

/** Typed slider configuration */
export interface SliderConfig {
  relevance: number;
  diversity: number;
  novelty: number;
  popularity: number;
  [key: string]: number;
}
