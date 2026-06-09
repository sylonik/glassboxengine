import { db } from "@glassbox/database/client";
import { sql } from "drizzle-orm";
import { getRedisConnection } from "@glassbox/event-pipeline";
import { getClickHouseClient } from "@glassbox/event-pipeline";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, "ok" | "error"> = {};
  let healthy = true;

  // Check PostgreSQL
  try {
    await db.execute(sql`SELECT 1`);
    checks.postgres = "ok";
  } catch {
    checks.postgres = "error";
    healthy = false;
  }

  try {
    const redis = getRedisConnection();
    await redis.ping();
    checks.redis = "ok";
  } catch {
    checks.redis = "error";
    healthy = false;
  }

  // ClickHouse powers analytics/funnels/tracking but is NOT required for the
  // core app (auth, catalog, personas, simulate). Report its status but don't
  // let a ClickHouse blip flip the service to 503 and cycle the Cloud Run
  // instance — only postgres + redis are critical.
  try {
    const clickhouse = getClickHouseClient();
    await clickhouse.ping();
    checks.clickhouse = "ok";
  } catch {
    checks.clickhouse = "error";
  }

  const status = healthy ? 200 : 503;

  return Response.json(
    {
      status: healthy ? "healthy" : "degraded",
      checks,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}
