import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAdd = vi.fn().mockResolvedValue({});
const mockAddBulk = vi.fn().mockResolvedValue([]);

vi.mock("../queue/connection", () => ({
  getRedisConnection: vi.fn(() => ({})),
}));

vi.mock("bullmq", () => ({
  Queue: class MockQueue {
    add = mockAdd;
    addBulk = mockAddBulk;
  },
}));

import type { FeedbackEventPayload, RecommendationEventPayload } from "../types";

const feedbackPayload: FeedbackEventPayload = {
  id: "evt-1",
  userId: "user-1",
  projectId: "proj-1",
  endUserId: "end-user-1",
  productId: "prod-1",
  eventType: "click",
  metadata: { source: "home" },
  createdAt: "2026-05-05T00:00:00Z",
};

const recommendationPayload: RecommendationEventPayload = {
  id: "rec-1",
  userId: "user-1",
  projectId: "proj-1",
  endUserId: "end-user-1",
  itemCount: 10,
  avgConfidence: 0.85,
  sliders: { relevance: 0.7 },
  category: "shoes",
  latencyMs: 150,
  createdAt: "2026-05-05T00:00:00Z",
};

describe("enqueueFeedbackEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("enqueues a single feedback event", async () => {
    // Re-import to get fresh module with mocks applied
    const { enqueueFeedbackEvent } = await import("../queue/queues");
    await enqueueFeedbackEvent(feedbackPayload);
    expect(mockAdd).toHaveBeenCalledWith("track", feedbackPayload);
  });

  it("does not throw on queue error (fire-and-forget)", async () => {
    const { enqueueFeedbackEvent } = await import("../queue/queues");
    mockAdd.mockRejectedValueOnce(new Error("Redis down"));
    await expect(enqueueFeedbackEvent(feedbackPayload)).resolves.toBeUndefined();
  });
});

describe("enqueueFeedbackEvents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("enqueues batch of feedback events", async () => {
    const { enqueueFeedbackEvents } = await import("../queue/queues");
    const payloads = [feedbackPayload, { ...feedbackPayload, id: "evt-2" }];
    await enqueueFeedbackEvents(payloads);
    expect(mockAddBulk).toHaveBeenCalledWith([
      { name: "track", data: payloads[0] },
      { name: "track", data: payloads[1] },
    ]);
  });

  it("skips empty array", async () => {
    const { enqueueFeedbackEvents } = await import("../queue/queues");
    await enqueueFeedbackEvents([]);
    expect(mockAdd).not.toHaveBeenCalled();
    expect(mockAddBulk).not.toHaveBeenCalled();
  });

  it("does not throw on queue error (fire-and-forget)", async () => {
    const { enqueueFeedbackEvents } = await import("../queue/queues");
    mockAddBulk.mockRejectedValueOnce(new Error("Redis down"));
    await expect(enqueueFeedbackEvents([feedbackPayload])).resolves.toBeUndefined();
  });
});

describe("enqueueRecommendationEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("enqueues a recommendation event", async () => {
    const { enqueueRecommendationEvent } = await import("../queue/queues");
    await enqueueRecommendationEvent(recommendationPayload);
    expect(mockAdd).toHaveBeenCalledWith("track", recommendationPayload);
  });
});
