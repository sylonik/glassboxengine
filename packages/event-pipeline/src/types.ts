export type EventType = "view" | "click" | "cart_add" | "purchase";

/** Shape of a feedback event job payload (enqueued by API, consumed by worker) */
export interface FeedbackEventPayload {
  id: string;
  userId: string;
  projectId: string;
  endUserId: string;
  productId: string | null;
  eventType: EventType;
  metadata: Record<string, unknown>;
  createdAt: string; // ISO-8601
}

/** Shape of a recommendation event job payload */
export interface RecommendationEventPayload {
  id: string;
  userId: string;
  projectId: string;
  endUserId: string;
  itemCount: number;
  avgConfidence: number | null;
  sliders: Record<string, unknown> | null;
  category: string | null;
  latencyMs: number | null;
  createdAt: string; // ISO-8601
}

/** Row written to ClickHouse feedback_events table */
export interface FeedbackEventRow {
  id: string;
  user_id: string;
  project_id: string;
  end_user_id: string;
  product_id: string;
  event_type: string;
  metadata: string; // JSON string
  created_at: string; // ISO-8601
}

/** Row written to ClickHouse recommendation_events table */
export interface RecommendationEventRow {
  id: string;
  user_id: string;
  project_id: string;
  end_user_id: string;
  item_count: number;
  avg_confidence: number;
  sliders: string; // JSON string
  category: string;
  latency_ms: number;
  created_at: string; // ISO-8601
}

// ---------------------------------------------------------------------------
// Website event tracking
// ---------------------------------------------------------------------------

/** Shape of a website event job payload (enqueued by API, consumed by worker) */
export interface WebsiteEventPayload {
  id: string;
  projectId: string;
  sessionId: string;
  anonymousId: string;
  userId: string;
  eventName: string;
  pageUrl: string;
  pagePath: string;
  pageTitle: string;
  referrer: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  deviceType: string;
  browser: string;
  os: string;
  screenWidth: number;
  screenHeight: number;
  country: string;
  properties: Record<string, unknown>;
  durationMs: number;
  createdAt: string; // ISO-8601
}

/** Row written to ClickHouse website_events table */
export interface WebsiteEventRow {
  id: string;
  project_id: string;
  session_id: string;
  anonymous_id: string;
  user_id: string;
  event_name: string;
  page_url: string;
  page_path: string;
  page_title: string;
  referrer: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  device_type: string;
  browser: string;
  os: string;
  screen_width: number;
  screen_height: number;
  country: string;
  properties: string; // JSON string
  duration_ms: number;
  created_at: string; // ISO-8601
}
