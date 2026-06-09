import {
  pgTable,
  uuid,
  text,
  integer,
  real,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";

export const recommendationEvents = pgTable(
  "recommendation_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    /** The end-user who received the recommendation */
    endUserId: text("end_user_id").notNull(),
    /** Number of items returned in this feed request */
    itemCount: integer("item_count").notNull().default(0),
    /** Average confidence across returned items */
    avgConfidence: real("avg_confidence"),
    /** Slider config used for this request */
    sliders: jsonb("sliders"),
    /** Category filter applied, if any */
    category: text("category"),
    /** Response latency in milliseconds */
    latencyMs: integer("latency_ms"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("rec_events_user_idx").on(table.userId),
    index("rec_events_project_idx").on(table.projectId),
    index("rec_events_end_user_idx").on(table.endUserId),
    index("rec_events_created_at_idx").on(table.createdAt),
  ]
);

export type RecommendationEvent = typeof recommendationEvents.$inferSelect;
export type NewRecommendationEvent = typeof recommendationEvents.$inferInsert;
