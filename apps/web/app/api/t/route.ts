import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@glassbox/database/client";
import { apiKeys } from "@glassbox/database/schema";
import { enqueueWebsiteEvents } from "@glassbox/event-pipeline";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

/** CORS preflight */
export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

const eventSchema = z.object({
  sessionId: z.string().min(1),
  anonymousId: z.string().min(1),
  userId: z.string().optional().default(""),
  eventName: z.string().min(1).max(100),
  pageUrl: z.string().optional().default(""),
  pagePath: z.string().optional().default(""),
  pageTitle: z.string().optional().default(""),
  referrer: z.string().optional().default(""),
  utmSource: z.string().optional().default(""),
  utmMedium: z.string().optional().default(""),
  utmCampaign: z.string().optional().default(""),
  deviceType: z.string().optional().default(""),
  browser: z.string().optional().default(""),
  os: z.string().optional().default(""),
  screenWidth: z.number().int().min(0).optional().default(0),
  screenHeight: z.number().int().min(0).optional().default(0),
  properties: z.record(z.unknown()).optional().default({}),
  durationMs: z.number().int().min(0).optional().default(0),
  timestamp: z.string().optional(),
});

const bodySchema = z.object({
  events: z.array(eventSchema).min(1).max(50),
});

async function hashKey(raw: string): Promise<string> {
  const data = new TextEncoder().encode(raw);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Lightweight REST endpoint for the tracker SDK.
 * POST /api/t — accepts JSON { events: [...] } with Bearer API key.
 */
export async function POST(req: Request) {
  // Auth — support both Authorization header and ?key= query param (for sendBeacon)
  const authHeader = req.headers.get("authorization");
  const url = new URL(req.url);
  const queryKey = url.searchParams.get("key");

  let rawKey: string | null = null;
  if (authHeader?.startsWith("Bearer ")) {
    rawKey = authHeader.slice(7);
  } else if (queryKey) {
    rawKey = queryKey;
  }

  if (!rawKey) {
    return NextResponse.json(
      { error: "Missing Authorization header or key parameter" },
      { status: 401, headers: corsHeaders }
    );
  }
  const keyHash = await hashKey(rawKey);

  const result = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, keyHash), isNull(apiKeys.revokedAt)))
    .limit(1);

  const key = result[0];
  if (!key) {
    return NextResponse.json(
      { error: "Invalid API key" },
      { status: 401, headers: corsHeaders }
    );
  }

  if (key.expiresAt && key.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "API key expired" },
      { status: 401, headers: corsHeaders }
    );
  }

  // Parse body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: 400, headers: corsHeaders }
    );
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400, headers: corsHeaders }
    );
  }

  // Enqueue events
  const payloads = parsed.data.events.map((event) => ({
    id: crypto.randomUUID(),
    projectId: key.projectId,
    sessionId: event.sessionId,
    anonymousId: event.anonymousId,
    userId: event.userId,
    eventName: event.eventName,
    pageUrl: event.pageUrl,
    pagePath: event.pagePath,
    pageTitle: event.pageTitle,
    referrer: event.referrer,
    utmSource: event.utmSource,
    utmMedium: event.utmMedium,
    utmCampaign: event.utmCampaign,
    deviceType: event.deviceType,
    browser: event.browser,
    os: event.os,
    screenWidth: event.screenWidth,
    screenHeight: event.screenHeight,
    country: "",
    properties: event.properties,
    durationMs: event.durationMs,
    createdAt: event.timestamp ?? new Date().toISOString(),
  }));

  void enqueueWebsiteEvents(payloads);

  // Update last used (fire-and-forget)
  void db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, key.id));

  return NextResponse.json(
    { ok: true, tracked: payloads.length },
    { status: 200, headers: corsHeaders }
  );
}
