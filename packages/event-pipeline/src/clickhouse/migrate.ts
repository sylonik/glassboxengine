import { createClient } from "@clickhouse/client";
import { createLogger } from "@glassbox/telemetry";
import {
  CREATE_DATABASE,
  CREATE_FEEDBACK_EVENTS_TABLE,
  CREATE_RECOMMENDATION_EVENTS_TABLE,
  CREATE_DAILY_FEEDBACK_SUMMARY_TARGET,
  CREATE_DAILY_FEEDBACK_SUMMARY_VIEW,
  CREATE_WEBSITE_EVENTS_TABLE,
  CREATE_DAILY_WEBSITE_SUMMARY_TARGET,
  CREATE_DAILY_WEBSITE_SUMMARY_VIEW,
} from "./schema";

const logger = createLogger("event-pipeline:migrate");

/**
 * Run all ClickHouse DDL migrations (idempotent — safe to run on every start).
 * Call this once during worker startup or a dedicated migration script.
 */
export async function runMigrations(): Promise<void> {
  const url = process.env.CLICKHOUSE_URL;
  if (!url) throw new Error("CLICKHOUSE_URL environment variable is required");

  // Bootstrap client is NOT scoped to the target database — the first
  // statement creates it, and all table DDL is fully qualified (glassbox.*).
  // Pinning the connection to a not-yet-existing database would fail with
  // UNKNOWN_DATABASE on the very first command.
  const client = createClient({ url });

  const statements = [
    { name: "database", sql: CREATE_DATABASE },
    { name: "feedback_events", sql: CREATE_FEEDBACK_EVENTS_TABLE },
    { name: "recommendation_events", sql: CREATE_RECOMMENDATION_EVENTS_TABLE },
    { name: "daily_feedback_summary (target)", sql: CREATE_DAILY_FEEDBACK_SUMMARY_TARGET },
    { name: "daily_feedback_summary_mv", sql: CREATE_DAILY_FEEDBACK_SUMMARY_VIEW },
    { name: "website_events", sql: CREATE_WEBSITE_EVENTS_TABLE },
    { name: "daily_website_summary (target)", sql: CREATE_DAILY_WEBSITE_SUMMARY_TARGET },
    { name: "daily_website_summary_mv", sql: CREATE_DAILY_WEBSITE_SUMMARY_VIEW },
  ];

  try {
    for (const { name, sql } of statements) {
      await client.command({ query: sql });
      logger.info({ migration: name }, "ClickHouse migration OK");
    }
  } finally {
    await client.close();
  }
}
