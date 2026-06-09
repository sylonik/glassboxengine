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
import { createServer } from "node:http";
import { createLogger } from "@glassbox/telemetry";
import { runMigrations } from "../clickhouse/migrate";
import { startFeedbackWorker } from "../queue/workers/feedback-worker";
import { startRecommendationWorker } from "../queue/workers/recommendation-worker";
import { startWebsiteEventWorker } from "../queue/workers/website-event-worker";
import { closeClickHouseClient } from "../clickhouse/client";
import { getRedisConnection } from "../queue/connection";

const logger = createLogger("event-pipeline");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Run ClickHouse migrations, retrying so a not-yet-ready backend (e.g. a
 *  freshly provisioned ClickHouse VM still booting) doesn't kill the process. */
async function migrateWithRetry(attempts = 12, delayMs = 5000): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      await runMigrations();
      return;
    } catch (err) {
      if (attempt >= attempts) throw err;
      logger.warn(
        { attempt, attempts, err },
        "ClickHouse migration failed — retrying"
      );
      await sleep(delayMs);
    }
  }
}

async function main() {
  // Start the health server FIRST so Cloud Run's startup probe passes
  // immediately — even before ClickHouse is reachable. Migrations and the
  // workers come up in the background with retry; a ClickHouse that isn't ready
  // yet must NOT fail the whole revision (Cloud Run would kill it and the queue
  // would never drain). The server stays up regardless; readiness of the
  // workers is reflected in logs.
  const port = Number(process.env.PORT ?? 8080);
  const health = createServer((_req, res) => {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("ok");
  });
  health.listen(port, "0.0.0.0", () => {
    logger.info({ port }, "Worker health server listening");
  });

  logger.info("Running ClickHouse migrations...");
  await migrateWithRetry();

  const feedbackWorker = startFeedbackWorker();
  const recommendationWorker = startRecommendationWorker();
  const websiteEventWorker = startWebsiteEventWorker();

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutdown signal received — closing workers");
    health.close();
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
