import {
  pgTable,
  uuid,
  text,
  jsonb,
  real,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    action: text("action").notNull(),
    inputContext: jsonb("input_context"),
    reasoning: text("reasoning"),
    agentName: text("agent_name"),
    confidenceScore: real("confidence_score"),
    traceId: text("trace_id"),
    spanId: text("span_id"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("audit_logs_user_idx").on(table.userId),
    index("audit_logs_project_idx").on(table.projectId),
    index("audit_logs_action_idx").on(table.action),
    index("audit_logs_trace_idx").on(table.traceId),
    index("audit_logs_created_at_idx").on(table.createdAt),
  ]
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
