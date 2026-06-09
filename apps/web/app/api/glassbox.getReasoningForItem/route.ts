import { NextResponse } from "next/server";
import { z } from "zod";
import { appRouter } from "@glassbox/api";
import { db } from "@glassbox/database/client";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

const bodySchema = z.object({
  itemId: z.string().min(1),
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
    const response = await caller.glassBox.sdkGetReasoningForItem({
      itemId: parsed.data.itemId,
    });

    return NextResponse.json(response, { status: 200, headers: corsHeaders });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Item trace lookup failed",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
