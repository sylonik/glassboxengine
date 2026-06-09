import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";

export const scoringFunctions = pgTable(
  "scoring_functions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    description: text("description"),
    code: text("code").notNull(),
    version: integer("version").default(1),
    isCommitted: boolean("is_committed").default(false),
    mentorFeedback: jsonb("mentor_feedback"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("scoring_functions_user_idx").on(table.userId),
    index("scoring_functions_project_idx").on(table.projectId),
  ]
);

export type ScoringFunction = typeof scoringFunctions.$inferSelect;
export type NewScoringFunction = typeof scoringFunctions.$inferInsert;

/** Structure of mentor feedback stored in JSONB */
export interface MentorFeedback {
  approved: boolean;
  issues: Array<{
    type: "math" | "security" | "performance";
    severity: "error" | "warning" | "info";
    message: string;
    socrticQuestion?: string;
    line?: number;
  }>;
  reviewedAt: string;
}
