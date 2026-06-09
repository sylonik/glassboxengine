import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { projects } from "./projects";

export const userProjectPreferences = pgTable("user_project_preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  activeProjectId: uuid("active_project_id").references(() => projects.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export type UserProjectPreference =
  typeof userProjectPreferences.$inferSelect;
export type NewUserProjectPreference =
  typeof userProjectPreferences.$inferInsert;
