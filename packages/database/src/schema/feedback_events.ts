import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { products } from "./products";

export const feedbackEvents = pgTable(
  "feedback_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    /** The end-user ID from the consuming application (passed via SDK) */
    endUserId: text("end_user_id").notNull(),
    /** view | click | cart_add | purchase */
    eventType: text("event_type").notNull(),
    /** Optional metadata: source page, session ID, value, etc. */
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("feedback_user_idx").on(table.userId),
    index("feedback_project_idx").on(table.projectId),
    index("feedback_product_idx").on(table.productId),
    index("feedback_end_user_idx").on(table.endUserId),
    index("feedback_event_type_idx").on(table.eventType),
    index("feedback_created_at_idx").on(table.createdAt),
  ]
);

export type FeedbackEvent = typeof feedbackEvents.$inferSelect;
export type NewFeedbackEvent = typeof feedbackEvents.$inferInsert;
