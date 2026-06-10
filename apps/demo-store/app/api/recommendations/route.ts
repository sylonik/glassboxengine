import { NextResponse } from "next/server";
import { PRODUCTS, type Product } from "../../../lib/catalog";

/**
 * Server-side proxy to the engine's public /api/glassbox.feed endpoint.
 * Maps engine feed items back onto local storefront products via the
 * externalId (the product slug the catalog was imported with), with a
 * name-based fallback for catalogs imported before external ids existed.
 *
 * Always returns 200 with `items: []` on any engine failure — the rail is
 * progressive enhancement, never a broken storefront.
 */
export const dynamic = "force-dynamic";

interface EngineScoreFactor {
  name: string;
  weight: number;
  rawValue: number;
  weightedValue: number;
  contribution: string;
}

interface EngineFeedItem {
  itemId: string;
  externalId?: string | null;
  name: string;
  score: number;
  reasoning: string;
  confidenceScore: number;
  scoreBreakdown?: EngineScoreFactor[];
  matchedSignals?: string[];
}

interface EngineFeedResponse {
  traceId?: string;
  summary?: string;
  searchExplanation?: string;
  items?: EngineFeedItem[];
}

export interface RailItem {
  product: Product;
  itemId: string;
  score: number;
  confidenceScore: number;
  reasoning: string;
  scoreBreakdown: EngineScoreFactor[];
  matchedSignals: string[];
}

const byId = new Map(PRODUCTS.map((p) => [p.id, p]));
const byName = new Map(PRODUCTS.map((p) => [p.name.toLowerCase(), p]));

export async function POST(req: Request) {
  let userId = "anon";
  let limit = 12;
  try {
    const body = (await req.json()) as { userId?: string; limit?: number };
    if (body.userId) userId = body.userId;
    if (typeof body.limit === "number") limit = Math.min(body.limit, 24);
  } catch {
    /* defaults */
  }

  const apiKey =
    process.env.GLASSBOX_API_KEY ??
    process.env.NEXT_PUBLIC_GLASSBOX_API_KEY ??
    "";
  const endpoint = (
    process.env.GLASSBOX_ENDPOINT ??
    process.env.NEXT_PUBLIC_GLASSBOX_ENDPOINT ??
    "http://localhost:3000"
  ).replace(/\/$/, "");

  if (!apiKey) {
    return NextResponse.json({ items: [], reason: "engine-not-configured" });
  }

  try {
    const res = await fetch(`${endpoint}/api/glassbox.feed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
      body: JSON.stringify({
        userId,
        queryText: "personalized storefront picks",
        limit,
      }),
    });
    if (!res.ok) {
      return NextResponse.json({ items: [], reason: `engine-${res.status}` });
    }

    const feed = (await res.json()) as EngineFeedResponse;
    const items: RailItem[] = (feed.items ?? [])
      .map((item) => {
        const product =
          (item.externalId ? byId.get(item.externalId) : undefined) ??
          byName.get(item.name.toLowerCase());
        if (!product) return null;
        return {
          product,
          itemId: item.itemId,
          score: item.score,
          confidenceScore: item.confidenceScore,
          reasoning: item.reasoning,
          scoreBreakdown: item.scoreBreakdown ?? [],
          matchedSignals: item.matchedSignals ?? [],
        };
      })
      .filter((item): item is RailItem => item !== null)
      .slice(0, 8);

    return NextResponse.json({
      traceId: feed.traceId ?? null,
      summary: feed.summary ?? null,
      explanation: feed.searchExplanation ?? null,
      items,
    });
  } catch {
    return NextResponse.json({ items: [], reason: "engine-unreachable" });
  }
}
