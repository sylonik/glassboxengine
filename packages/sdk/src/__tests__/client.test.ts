import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GlassBox } from "../client";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status: number) {
  return new Response(message, { status });
}

describe("GlassBox SDK", () => {
  let client: GlassBox;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new GlassBox({
      endpoint: "https://api.example.com",
      apiKey: "gb_live_test123",
    });
  });

  describe("constructor", () => {
    it("throws if endpoint is missing", () => {
      expect(() => new GlassBox({ endpoint: "", apiKey: "key" })).toThrow(
        "endpoint is required"
      );
    });

    it("throws if apiKey is missing", () => {
      expect(() => new GlassBox({ endpoint: "https://api.example.com", apiKey: "" })).toThrow(
        "apiKey is required"
      );
    });

    it("strips trailing slash from endpoint", () => {
      const c = new GlassBox({
        endpoint: "https://api.example.com/",
        apiKey: "key",
      });
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          traceId: "trace-1",
          policy: {
            version: "policy-1",
            sliders: {
              relevance: 0.7,
              diversity: 0.4,
              novelty: 0.3,
              popularity: 0.6,
            },
            constraints: [],
            author: "user-1",
            createdAt: new Date().toISOString(),
          },
          queryText: "personalized product recommendations",
          searchExplanation: "Balanced ranking across all dimensions.",
          summary: "Returned 0 ranked items.",
          items: [],
          trace: {
            traceId: "trace-1",
            policyVersion: "policy-1",
            appliedConstraints: [],
            topFactors: [],
            summary: "Returned 0 ranked items.",
            steps: [],
          },
        })
      );
      c.getPersonalizedFeed("user-1");
      expect(mockFetch.mock.calls[0]![0]).toBe("https://api.example.com/glassbox.feed");
    });
  });

  describe("getPersonalizedFeed", () => {
    it("sends correct request", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          traceId: "trace-abc",
          policy: {
            version: "policy-1",
            sliders: {
              relevance: 0.7,
              diversity: 0.4,
              novelty: 0.3,
              popularity: 0.6,
            },
            constraints: [],
            author: "user-1",
            createdAt: "2026-05-16T00:00:00.000Z",
          },
          queryText: "personalized product recommendations",
          searchExplanation: "Balanced ranking across all dimensions.",
          summary: "Returned 1 ranked item.",
          items: [
            {
              itemId: "1",
              name: "Test Product",
              description: null,
              category: "shoes",
              score: 0.9,
              reasoning: "test",
              confidenceScore: 0.9,
              scoreBreakdown: [],
              matchedSignals: ["relevance"],
            },
          ],
          trace: {
            traceId: "trace-abc",
            policyVersion: "policy-1",
            appliedConstraints: [],
            topFactors: ["relevance"],
            summary: "Returned 1 ranked item.",
            steps: [],
          },
        })
      );

      const result = await client.getPersonalizedFeed("user-1", { limit: 10, category: "shoes" });

      expect(mockFetch).toHaveBeenCalledOnce();
      const [url, opts] = mockFetch.mock.calls[0]!;
      expect(url).toBe("https://api.example.com/glassbox.feed");
      expect(opts.method).toBe("POST");
      expect(opts.headers["Authorization"]).toBe("Bearer gb_live_test123");
      expect(JSON.parse(opts.body)).toEqual({
        userId: "user-1",
        queryText: undefined,
        limit: 10,
        category: "shoes",
        sliders: undefined,
      });
      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.itemId).toBe("1");
      expect(result.traceId).toBe("trace-abc");
    });

    it("uses default limit of 20", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          traceId: "trace-empty",
          policy: {
            version: "policy-1",
            sliders: {
              relevance: 0.5,
              diversity: 0.5,
              novelty: 0.5,
              popularity: 0.5,
            },
            constraints: [],
            author: "user-1",
            createdAt: "2026-05-16T00:00:00.000Z",
          },
          queryText: "personalized product recommendations",
          searchExplanation: "Balanced ranking across all dimensions.",
          summary: "Returned 0 ranked items.",
          items: [],
          trace: {
            traceId: "trace-empty",
            policyVersion: "policy-1",
            appliedConstraints: [],
            topFactors: [],
            summary: "Returned 0 ranked items.",
            steps: [],
          },
        })
      );
      await client.getPersonalizedFeed("user-1");

      const body = JSON.parse(mockFetch.mock.calls[0]![1].body);
      expect(body.limit).toBe(20);
    });

    it("throws on API error", async () => {
      mockFetch.mockResolvedValueOnce(errorResponse("Not Found", 404));

      await expect(client.getPersonalizedFeed("user-1")).rejects.toThrow(
        "GlassBox API error (404): Not Found"
      );
    });
  });

  describe("getReasoningChain", () => {
    it("sends correct request", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          traceId: "trace-item",
          policyVersion: "policy-1",
          appliedConstraints: [],
          topFactors: [],
          summary: "ok",
          steps: [],
        })
      );

      await client.getReasoningChain("user-1", "item-1");

      const [url, opts] = mockFetch.mock.calls[0]!;
      expect(url).toBe("https://api.example.com/glassbox.getReasoningForItem");
      expect(JSON.parse(opts.body)).toEqual({ userId: "user-1", itemId: "item-1" });
    });
  });

  describe("getReasoningChainByTrace", () => {
    it("sends correct request", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          traceId: "trace-abc",
          policyVersion: "policy-1",
          appliedConstraints: [],
          topFactors: [],
          summary: "ok",
          steps: [],
        })
      );

      await client.getReasoningChainByTrace("trace-abc");

      const [url, opts] = mockFetch.mock.calls[0]!;
      expect(url).toBe("https://api.example.com/glassbox.getReasoningChain");
      expect(JSON.parse(opts.body)).toEqual({ traceId: "trace-abc" });
    });
  });

  describe("trackEvent", () => {
    it("sends correct request", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({}));

      await client.trackEvent({
        endUserId: "user-1",
        productId: "product-1",
        eventType: "click",
        metadata: { source: "home" },
      });

      const [url, opts] = mockFetch.mock.calls[0]!;
      expect(url).toBe("https://api.example.com/glassbox.trackEvent");
      const body = JSON.parse(opts.body);
      expect(body.eventType).toBe("click");
      expect(body.metadata).toEqual({ source: "home" });
    });

    it("throws on server error", async () => {
      mockFetch.mockResolvedValueOnce(errorResponse("Internal Server Error", 500));

      await expect(
        client.trackEvent({
          endUserId: "user-1",
          productId: "product-1",
          eventType: "view",
        })
      ).rejects.toThrow("GlassBox API error (500)");
    });
  });

  describe("trackEvents", () => {
    it("sends batch request", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ tracked: 2 }));

      const result = await client.trackEvents([
        { endUserId: "u1", productId: "p1", eventType: "view" },
        { endUserId: "u1", productId: "p2", eventType: "click" },
      ]);

      const [url, opts] = mockFetch.mock.calls[0]!;
      expect(url).toBe("https://api.example.com/glassbox.trackEvents");
      const body = JSON.parse(opts.body);
      expect(body.events).toHaveLength(2);
      expect(result.tracked).toBe(2);
    });
  });
});
