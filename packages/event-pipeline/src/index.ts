// ClickHouse client — used by analytics routers to query event data
export { getClickHouseClient } from "./clickhouse/client";
export { getRedisConnection } from "./queue/connection";

// Queue producers — import these in the API package to enqueue events
export {
  enqueueFeedbackEvent,
  enqueueFeedbackEvents,
  enqueueRecommendationEvent,
  enqueueWebsiteEvent,
  enqueueWebsiteEvents,
} from "./queue/queues";

// Types
export type {
  EventType,
  FeedbackEventPayload,
  RecommendationEventPayload,
  FeedbackEventRow,
  RecommendationEventRow,
  WebsiteEventPayload,
  WebsiteEventRow,
} from "./types";
