/**
 * Entry point for the event-pipeline worker process.
 *
 * Run with:
 *   pnpm --filter @glassbox/event-pipeline workers
 *
 * Or directly:
 *   node --import tsx/esm src/scripts/start-workers.ts
 *
 * Required env vars:
 *   REDIS_URL        e.g. redis://localhost:6379
 *   CLICKHOUSE_URL   e.g. http://localhost:8123
 *   CLICKHOUSE_DATABASE  (default: glassbox)
 */

import "dotenv/config";
import { createLogger } from "@glassbox/telemetry";
import { runMigrations } from "../clickhouse/migrate";
import { startFeedbackWorker } from "../queue/workers/feedback-worker";
import { startRecommendationWorker } from "../queue/workers/recommendation-worker";
import { startWebsiteEventWorker } from "../queue/workers/website-event-worker";
import { closeClickHouseClient } from "../clickhouse/client";
import { getRedisConnection } from "../queue/connection";

const logger = createLogger("event-pipeline");

async function main() {
  logger.info("Running ClickHouse migrations...");
  await runMigrations();

  const feedbackWorker = startFeedbackWorker();
  const recommendationWorker = startRecommendationWorker();
  const websiteEventWorker = startWebsiteEventWorker();

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutdown signal received — closing workers");
    await Promise.all([
      feedbackWorker.close(),
      recommendationWorker.close(),
      websiteEventWorker.close(),
    ]);
    await closeClickHouseClient();
    getRedisConnection().disconnect();
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  logger.info("Workers running. Waiting for jobs...");
}

main().catch((err) => {
  logger.fatal({ err }, "Fatal startup error");
  process.exit(1);
});
