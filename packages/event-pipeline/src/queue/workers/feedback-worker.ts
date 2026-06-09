import { Worker } from "bullmq";
import { createLogger } from "@glassbox/telemetry";
import { getRedisConnection } from "../connection";
import { QUEUE_NAMES } from "../names";
import { getClickHouseClient } from "../../clickhouse/client";
import type { FeedbackEventPayload, FeedbackEventRow } from "../../types";

const logger = createLogger("event-pipeline:feedback-worker");

function toRow(payload: FeedbackEventPayload): FeedbackEventRow {
  return {
    id: payload.id,
    user_id: payload.userId,
    project_id: payload.projectId,
    end_user_id: payload.endUserId,
    product_id: payload.productId ?? "",
    event_type: payload.eventType,
    metadata: JSON.stringify(payload.metadata),
    created_at: payload.createdAt,
  };
}

/**
 * Start the feedback event worker.
 *
 * Concurrency of 20 means up to 20 jobs are processed in parallel.
 * Combined with ClickHouse async_insert, the server batches these
 * writes automatically — no client-side accumulation needed.
 */
export function startFeedbackWorker(): Worker<FeedbackEventPayload> {
  const worker = new Worker<FeedbackEventPayload>(
    QUEUE_NAMES.feedback,
    async (job) => {
      const client = getClickHouseClient();
      await client.insert({
        table: "glassbox.feedback_events",
        values: [toRow(job.data)],
        format: "JSONEachRow",
      });
    },
    {
      connection: getRedisConnection(),
      concurrency: 20,
    }
  );

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Job failed");
  });

  logger.info("feedback-worker started");
  return worker;
}
