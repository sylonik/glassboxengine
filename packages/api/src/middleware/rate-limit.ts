import type Redis from "ioredis";
import { TRPCError } from "@trpc/server";

export interface RateLimitConfig {
  /** Maximum requests per window */
  limit: number;
  /** Window size in seconds */
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  limit: 100,
  windowSeconds: 60,
};

/**
 * Sliding-window rate limiter using Redis INCR + EXPIRE.
 * Returns rate limit metadata for response headers.
 */
export async function checkRateLimit(
  redis: Redis,
  identifier: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): Promise<RateLimitResult> {
  const window = Math.floor(Date.now() / 1000 / config.windowSeconds);
  const key = `ratelimit:${identifier}:${window}`;

  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, config.windowSeconds);
  }

  const resetAt = (window + 1) * config.windowSeconds;

  return {
    allowed: count <= config.limit,
    limit: config.limit,
    remaining: Math.max(0, config.limit - count),
    resetAt,
  };
}

/**
 * Throws a TRPCError if rate limit is exceeded.
 */
export async function enforceRateLimit(
  redis: Redis,
  identifier: string,
  config?: RateLimitConfig
): Promise<RateLimitResult> {
  const result = await checkRateLimit(redis, identifier, config);

  if (!result.allowed) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Rate limit exceeded. Try again in ${result.resetAt - Math.floor(Date.now() / 1000)} seconds.`,
    });
  }

  return result;
}
