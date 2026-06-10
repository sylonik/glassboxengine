import Redis from "ioredis";

let _redis: Redis | undefined;

/** Shared ioredis singleton. Returns undefined when REDIS_URL is unset (local dev). */
export function getRedis(): Redis | undefined {
  if (_redis) return _redis;
  const url = process.env.REDIS_URL;
  if (!url) return undefined;
  _redis = new Redis(url, { maxRetriesPerRequest: null });
  return _redis;
}
