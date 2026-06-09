import { Worker } from "bullmq";
import { createLogger } from "@glassbox/telemetry";
import { getRedisConnection } from "../connection";
import { QUEUE_NAMES } from "../names";
import { getClickHouseClient } from "../../clickhouse/client";
import type {
  RecommendationEventPayload,
  RecommendationEventRow,
} from "../../types";

const logger = createLogger("event-pipeline:recommendation-worker");

function toRow(payload: RecommendationEventPayload): RecommendationEventRow {
  return {
    id: payload.id,
    user_id: payload.userId,
    project_id: payload.projectId,
    end_user_id: payload.endUserId,
    item_count: payload.itemCount,
    avg_confidence: payload.avgConfidence ?? 0,
    sliders: JSON.stringify(payload.sliders ?? {}),
    category: payload.category ?? "",
    latency_ms: payload.latencyMs ?? 0,
    created_at: payload.createdAt,
  };
}

export function startRecommendationWorker(): Worker<RecommendationEventPayload> {
  const worker = new Worker<RecommendationEventPayload>(
    QUEUE_NAMES.recommendations,
    async (job) => {
      const client = getClickHouseClient();
      await client.insert({
        table: "glassbox.recommendation_events",
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

  logger.info("recommendation-worker started");
  return worker;
}
