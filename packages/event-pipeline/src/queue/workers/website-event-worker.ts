import { Worker } from "bullmq";
import { createLogger } from "@glassbox/telemetry";
import { getRedisConnection } from "../connection";
import { QUEUE_NAMES } from "../names";
import { getClickHouseClient } from "../../clickhouse/client";
import type { WebsiteEventPayload, WebsiteEventRow } from "../../types";

const logger = createLogger("event-pipeline:website-event-worker");

/**
 * ClickHouse's default `date_time_input_format` (basic) cannot parse ISO-8601
 * strings with a `T` separator or `Z` suffix — it errors on the `Z` and, under
 * async_insert with wait_for_async_insert=0, silently drops the row. Incoming
 * `createdAt` values are ISO-8601 UTC (e.g. "2026-06-09T10:39:55.997Z"). Emit
 * the `YYYY-MM-DD HH:MM:SS.sss` form ClickHouse expects (already UTC). Falls
 * back to now() on unparseable input so a bad timestamp never drops an event.
 */
function toClickHouseDateTime(value: string): string {
  const d = new Date(value);
  const ts = Number.isNaN(d.getTime()) ? new Date() : d;
  return ts.toISOString().replace("T", " ").replace("Z", "");
}

function toRow(payload: WebsiteEventPayload): WebsiteEventRow {
  return {
    id: payload.id,
    project_id: payload.projectId,
    session_id: payload.sessionId,
    anonymous_id: payload.anonymousId,
    user_id: payload.userId,
    event_name: payload.eventName,
    page_url: payload.pageUrl,
    page_path: payload.pagePath,
    page_title: payload.pageTitle,
    referrer: payload.referrer,
    utm_source: payload.utmSource,
    utm_medium: payload.utmMedium,
    utm_campaign: payload.utmCampaign,
    device_type: payload.deviceType,
    browser: payload.browser,
    os: payload.os,
    screen_width: payload.screenWidth,
    screen_height: payload.screenHeight,
    country: payload.country,
    properties: JSON.stringify(payload.properties),
    duration_ms: payload.durationMs,
    created_at: toClickHouseDateTime(payload.createdAt),
  };
}

/**
 * Start the website event worker.
 *
 * Concurrency of 20 means up to 20 jobs are processed in parallel.
 * Combined with ClickHouse async_insert, the server batches these
 * writes automatically — no client-side accumulation needed.
 */
export function startWebsiteEventWorker(): Worker<WebsiteEventPayload> {
  const worker = new Worker<WebsiteEventPayload>(
    QUEUE_NAMES.websiteEvents,
    async (job) => {
      const client = getClickHouseClient();
      await client.insert({
        table: "glassbox.website_events",
        values: [toRow(job.data)],
        format: "JSONEachRow",
        // Tolerate ISO-8601 datetimes defensively, in addition to toRow's
        // normalization, so a future payload shape can't silently drop rows.
        clickhouse_settings: { date_time_input_format: "best_effort" },
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

  logger.info("website-event-worker started");
  return worker;
}
