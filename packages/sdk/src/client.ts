import type {
  GlassBoxConfig,
  FeedOptions,
  RecommendationResponse,
  ReasoningTrace,
  TrackEvent,
} from "./types.js";

export class GlassBox {
  private endpoint: string;
  private apiKey: string;
  private timeout: number;

  constructor(config: GlassBoxConfig) {
    if (!config.endpoint) throw new Error("GlassBox: endpoint is required");
    if (!config.apiKey) throw new Error("GlassBox: apiKey is required");

    this.endpoint = config.endpoint.replace(/\/$/, "");
    this.apiKey = config.apiKey;
    this.timeout = config.timeout ?? 10000;
  }

  /**
   * Get a personalized feed for a specific user.
   * Returns ranked items plus the structured reasoning trace for the request.
   */
  async getPersonalizedFeed(
    userId: string,
    options?: FeedOptions
  ): Promise<RecommendationResponse> {
    const response = await fetch(`${this.endpoint}/glassbox.feed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        userId,
        queryText: options?.queryText,
        limit: options?.limit ?? 20,
        category: options?.category,
        sliders: options?.sliders,
      }),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const error = await response.text().catch(() => "Unknown error");
      throw new Error(`GlassBox API error (${response.status}): ${error}`);
    }

    const data = await response.json();
    return data as RecommendationResponse;
  }

  /**
   * Get the reasoning chain for a specific recommendation by item ID.
   * Looks up the most recent trace that references this item.
   */
  async getReasoningChain(
    userId: string,
    itemId: string
  ): Promise<ReasoningTrace> {
    const response = await fetch(`${this.endpoint}/glassbox.getReasoningForItem`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ userId, itemId }),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const error = await response.text().catch(() => "Unknown error");
      throw new Error(`GlassBox API error (${response.status}): ${error}`);
    }

    return response.json();
  }

  /**
   * Get the full reasoning chain by trace ID.
   */
  async getReasoningChainByTrace(
    traceId: string
  ): Promise<ReasoningTrace> {
    const response = await fetch(`${this.endpoint}/glassbox.getReasoningChain`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ traceId }),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const error = await response.text().catch(() => "Unknown error");
      throw new Error(`GlassBox API error (${response.status}): ${error}`);
    }

    return response.json();
  }

  /**
   * Track a single user interaction event (view, click, cart_add, purchase).
   */
  async trackEvent(event: TrackEvent): Promise<void> {
    const response = await fetch(`${this.endpoint}/glassbox.trackEvent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const error = await response.text().catch(() => "Unknown error");
      throw new Error(`GlassBox API error (${response.status}): ${error}`);
    }
  }

  /**
   * Track multiple events in a single request (max 100).
   */
  async trackEvents(events: TrackEvent[]): Promise<{ tracked: number }> {
    const response = await fetch(`${this.endpoint}/glassbox.trackEvents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ events }),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const error = await response.text().catch(() => "Unknown error");
      throw new Error(`GlassBox API error (${response.status}): ${error}`);
    }

    return response.json();
  }
}
