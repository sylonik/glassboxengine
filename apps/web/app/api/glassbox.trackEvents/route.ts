import { NextResponse } from "next/server";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { appRouter } from "@glassbox/api";
import { db } from "@glassbox/database/client";

// Map tRPC error codes to HTTP status so a missing/invalid API key returns 401,
// validation 400, rate-limit 429 — not an opaque 500.
const TRPC_HTTP_STATUS: Record<string, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

const bodySchema = z.object({
  events: z
    .array(
      z.object({
        endUserId: z.string().min(1),
        productId: z.string().uuid(),
        eventType: z.enum(["view", "click", "cart_add", "purchase"]),
        metadata: z.record(z.unknown()).optional(),
      })
    )
    .min(1)
    .max(100),
});

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: Request) {
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

  try {
    const caller = appRouter.createCaller({
      db,
      user: null,
      authHeader: req.headers.get("authorization"),
    });
    const response = await caller.feedback.sdkTrackBatch(parsed.data);

    return NextResponse.json(response, { status: 200, headers: corsHeaders });
  } catch (error) {
    const status =
      error instanceof TRPCError
        ? (TRPC_HTTP_STATUS[error.code] ?? 500)
        : 500;
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Batch event tracking failed",
      },
      { status, headers: corsHeaders }
    );
  }
}
