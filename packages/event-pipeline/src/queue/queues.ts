import { Queue } from "bullmq";
import { createLogger } from "@glassbox/telemetry";
import { getRedisConnection } from "./connection";
import { QUEUE_NAMES } from "./names";
import type {
  FeedbackEventPayload,
  RecommendationEventPayload,
  WebsiteEventPayload,
} from "../types";

const logger = createLogger("event-pipeline:queues");

const DEFAULT_JOB_OPTIONS = {
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 500 },
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 2000 },
};

let _feedbackQueue: Queue<FeedbackEventPayload> | null = null;
let _recommendationQueue: Queue<RecommendationEventPayload> | null = null;

export function getFeedbackQueue(): Queue<FeedbackEventPayload> {
  if (!_feedbackQueue) {
    _feedbackQueue = new Queue<FeedbackEventPayload>(QUEUE_NAMES.feedback, {
      connection: getRedisConnection(),
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });
  }
  return _feedbackQueue;
}

export function getRecommendationQueue(): Queue<RecommendationEventPayload> {
  if (!_recommendationQueue) {
    _recommendationQueue = new Queue<RecommendationEventPayload>(
      QUEUE_NAMES.recommendations,
      {
        connection: getRedisConnection(),
        defaultJobOptions: DEFAULT_JOB_OPTIONS,
      }
    );
  }
  return _recommendationQueue;
}

/** Enqueue a single feedback event. Fire-and-forget: errors are logged, not thrown. */
export async function enqueueFeedbackEvent(
  payload: FeedbackEventPayload
): Promise<void> {
  try {
    await getFeedbackQueue().add("track", payload);
  } catch (err) {
    logger.error({ err }, "Failed to enqueue feedback event");
  }
}

/** Enqueue a single recommendation event. Fire-and-forget. */
export async function enqueueRecommendationEvent(
  payload: RecommendationEventPayload
): Promise<void> {
  try {
    await getRecommendationQueue().add("track", payload);
  } catch (err) {
    logger.error({ err }, "Failed to enqueue recommendation event");
  }
}

/** Enqueue multiple feedback events in one Redis round-trip. */
export async function enqueueFeedbackEvents(
  payloads: FeedbackEventPayload[]
): Promise<void> {
  if (payloads.length === 0) return;
  try {
    await getFeedbackQueue().addBulk(
      payloads.map((p) => ({ name: "track", data: p }))
    );
  } catch (err) {
    logger.error({ err }, "Failed to enqueue feedback batch");
  }
}

// ---------------------------------------------------------------------------
// Website event queue
// ---------------------------------------------------------------------------

let _websiteEventQueue: Queue<WebsiteEventPayload> | null = null;

export function getWebsiteEventQueue(): Queue<WebsiteEventPayload> {
  if (!_websiteEventQueue) {
    _websiteEventQueue = new Queue<WebsiteEventPayload>(
      QUEUE_NAMES.websiteEvents,
      {
        connection: getRedisConnection(),
        defaultJobOptions: DEFAULT_JOB_OPTIONS,
      }
    );
  }
  return _websiteEventQueue;
}

/** Enqueue a single website event. Fire-and-forget: errors are logged, not thrown. */
export async function enqueueWebsiteEvent(
  payload: WebsiteEventPayload
): Promise<void> {
  try {
    await getWebsiteEventQueue().add("track", payload);
  } catch (err) {
    logger.error({ err }, "Failed to enqueue website event");
  }
}

/** Enqueue multiple website events in one Redis round-trip. */
export async function enqueueWebsiteEvents(
  payloads: WebsiteEventPayload[]
): Promise<void> {
  if (payloads.length === 0) return;
  try {
    await getWebsiteEventQueue().addBulk(
      payloads.map((p) => ({ name: "track", data: p }))
    );
  } catch (err) {
    logger.error({ err }, "Failed to enqueue website event batch");
  }
}
