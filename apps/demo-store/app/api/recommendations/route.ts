import { NextResponse } from "next/server";
import { PRODUCTS, type Product } from "../../../lib/catalog";
import { resolveIntent } from "../../../lib/intent";

/**
 * Server-side proxy to the engine's public /api/glassbox.feed endpoint.
 * Maps engine feed items back onto local storefront products via the
 * externalId (the product slug the catalog was imported with), with a
 * name-based fallback for catalogs imported before external ids existed.
 *
 * This is where personalization is decided: the storefront only sends the
 * `userId` (+ an optional search `queryText`). The server resolves that user
 * into an *intent* (queryText + policy sliders) via resolveIntent() and passes
 * it to the engine. That's why different shoppers get different feeds from the
 * same catalog — see lib/intent.ts for the full rationale. An explicit search
 * query, when present, overrides the persona's default query so search becomes
 * a *personalized re-rank* rather than a flat catalog filter.
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
  let searchQuery: string | undefined;
  try {
    const body = (await req.json()) as {
      userId?: string;
      limit?: number;
      queryText?: string;
    };
    if (body.userId) userId = body.userId;
    if (typeof body.limit === "number") limit = Math.min(body.limit, 24);
    if (typeof body.queryText === "string" && body.queryText.trim()) {
      searchQuery = body.queryText.trim();
    }
  } catch {
    /* defaults */
  }

  // Personalization decision happens server-side: resolve the user into an
  // intent (queryText + sliders). A live search query, if present, takes the
  // place of the persona's default query so the feed re-ranks for that search.
  const intent = resolveIntent(userId);
  const effectiveQuery = searchQuery ?? intent.queryText;

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
        queryText: effectiveQuery,
        limit,
        sliders: intent.sliders,
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
      // Echo back how this feed was personalized so the rail can self-explain.
      intentLabel: searchQuery ? "search re-rank" : intent.label,
      queryText: effectiveQuery,
      items,
    });
  } catch {
    return NextResponse.json({ items: [], reason: "engine-unreachable" });
  }
}
