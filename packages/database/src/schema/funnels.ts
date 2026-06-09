import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";

export const funnels = pgTable(
  "funnels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("funnels_user_idx").on(table.userId),
    index("funnels_project_idx").on(table.projectId),
  ]
);

export const funnelSteps = pgTable(
  "funnel_steps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    funnelId: uuid("funnel_id")
      .notNull()
      .references(() => funnels.id, { onDelete: "cascade" }),
    stepOrder: integer("step_order").notNull(),
    /** Which column to match in ClickHouse: "event_name" or "page_path" */
    matchField: text("match_field").notNull().default("event_name"),
    /** The value to match, e.g. "page_view" or "/pricing" */
    matchValue: text("match_value").notNull(),
    /** Human-readable label for the funnel step, e.g. "Landing Page" */
    label: text("label").notNull(),
  },
  (table) => [
    index("funnel_steps_funnel_idx").on(table.funnelId),
    index("funnel_steps_order_idx").on(table.funnelId, table.stepOrder),
  ]
);

export type Funnel = typeof funnels.$inferSelect;
export type NewFunnel = typeof funnels.$inferInsert;
export type FunnelStep = typeof funnelSteps.$inferSelect;
export type NewFunnelStep = typeof funnelSteps.$inferInsert;
