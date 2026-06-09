import Redis from "ioredis";
import { createLogger } from "@glassbox/telemetry";

let _redis: Redis | null = null;
const logger = createLogger("event-pipeline:redis");

export function getRedisConnection(): Redis {
  if (_redis) return _redis;

  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL environment variable is required");

  _redis = new Redis(url, {
    maxRetriesPerRequest: null, // required by BullMQ
  });
  _redis.on("error", (error) => {
    logger.warn({ error }, "Redis connection error");
  });

  return _redis;
}
