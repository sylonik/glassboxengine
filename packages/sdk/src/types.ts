/** A single item in the personalized feed response */
export interface FeedItem {
  itemId: string;
  /** Your own product id (the catalog external_id you imported), for mapping
   * feed items back onto your catalog. Null for products created without one. */
  externalId: string | null;
  name: string;
  description: string | null;
  category: string | null;
  score: number;
  reasoning: string;
  confidenceScore: number;
  scoreBreakdown: Array<{
    name: string;
    weight: number;
    rawValue: number;
    weightedValue: number;
    contribution: string;
  }>;
  matchedSignals: string[];
}

export interface PolicySpec {
  version: string;
  sliders: {
    relevance: number;
    diversity: number;
    novelty: number;
    popularity: number;
  };
  constraints: Array<{
    type: string;
    value: string | number;
    reason: string;
  }>;
  author: string;
  createdAt: string;
}

export interface ReasoningTrace {
  traceId: string;
  policyVersion: string;
  appliedConstraints: string[];
  topFactors: string[];
  summary: string;
  steps: Array<{
    agent: string;
    action: string;
    reasoning: string;
    metadata?: Record<string, unknown>;
  }>;
}

export interface RecommendationResponse {
  traceId: string;
  policy: PolicySpec;
  queryText: string;
  searchExplanation: string;
  summary: string;
  items: FeedItem[];
  trace: ReasoningTrace;
}

/** Configuration for the GlassBox SDK client */
export interface GlassBoxConfig {
  /** The tRPC endpoint URL */
  endpoint: string;
  /** API key for authentication */
  apiKey: string;
  /** Request timeout in milliseconds (default: 10000) */
  timeout?: number;
}

/** Options for getPersonalizedFeed */
export interface FeedOptions {
  /** Maximum number of items to return */
  limit?: number;
  /** Filter by category */
  category?: string;
  /** Optional recommendation intent query */
  queryText?: string;
  /** Custom slider overrides */
  sliders?: {
    relevance?: number;
    diversity?: number;
    novelty?: number;
    popularity?: number;
  };
}

/** A single feedback event to track */
export interface TrackEvent {
  /** The end-user ID in your application */
  endUserId: string;
  /** The product/item ID from your catalog */
  productId: string;
  /** Event type */
  eventType: "view" | "click" | "cart_add" | "purchase";
  /** Optional metadata (e.g. source page, session ID) */
  metadata?: Record<string, unknown>;
}
