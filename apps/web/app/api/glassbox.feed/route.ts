import { NextResponse } from "next/server";
import { z } from "zod";
import { appRouter } from "@glassbox/api";
import { db } from "@glassbox/database/client";
import { getRedis } from "~/lib/redis";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

const bodySchema = z.object({
  userId: z.string().min(1),
  queryText: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  category: z.string().optional(),
  sliders: z
    .object({
      relevance: z.number().min(0).max(1).optional(),
      diversity: z.number().min(0).max(1).optional(),
      novelty: z.number().min(0).max(1).optional(),
      popularity: z.number().min(0).max(1).optional(),
    })
    .optional(),
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
      redis: getRedis(),
      user: null,
      authHeader: req.headers.get("authorization"),
    });
    const response = await caller.glassBox.recommend({
      endUserId: parsed.data.userId,
      queryText:
        parsed.data.queryText ?? "personalized product recommendations",
      limit: parsed.data.limit,
      category: parsed.data.category,
      sliders: parsed.data.sliders,
    });

    return NextResponse.json(response, { status: 200, headers: corsHeaders });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Recommendation failed",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
