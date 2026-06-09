import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkRateLimit, enforceRateLimit } from "../../middleware/rate-limit";

// Mock Redis with in-memory counter
function createMockRedis() {
  const store = new Map<string, number>();
  return {
    incr: vi.fn(async (key: string) => {
      const val = (store.get(key) ?? 0) + 1;
      store.set(key, val);
      return val;
    }),
    expire: vi.fn().mockResolvedValue(1),
    _store: store,
    _reset: () => store.clear(),
  };
}

describe("rate limiter", () => {
  let redis: ReturnType<typeof createMockRedis>;

  beforeEach(() => {
    redis = createMockRedis();
  });

  it("allows requests under the limit", async () => {
    const result = await checkRateLimit(redis as any, "user:1", {
      limit: 5,
      windowSeconds: 60,
    });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.limit).toBe(5);
  });

  it("sets expire on first request in window", async () => {
    await checkRateLimit(redis as any, "user:1", {
      limit: 5,
      windowSeconds: 60,
    });
    expect(redis.expire).toHaveBeenCalledOnce();
  });

  it("blocks after exceeding limit", async () => {
    const config = { limit: 3, windowSeconds: 60 };

    await checkRateLimit(redis as any, "user:1", config);
    await checkRateLimit(redis as any, "user:1", config);
    await checkRateLimit(redis as any, "user:1", config);
    const result = await checkRateLimit(redis as any, "user:1", config);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("enforceRateLimit throws TOO_MANY_REQUESTS when exceeded", async () => {
    const config = { limit: 1, windowSeconds: 60 };

    await enforceRateLimit(redis as any, "user:1", config);
    await expect(
      enforceRateLimit(redis as any, "user:1", config)
    ).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
  });

  it("tracks separate limits per identifier", async () => {
    const config = { limit: 2, windowSeconds: 60 };

    await checkRateLimit(redis as any, "user:1", config);
    await checkRateLimit(redis as any, "user:1", config);
    const result1 = await checkRateLimit(redis as any, "user:1", config);
    const result2 = await checkRateLimit(redis as any, "user:2", config);

    expect(result1.allowed).toBe(false);
    expect(result2.allowed).toBe(true);
  });
});
