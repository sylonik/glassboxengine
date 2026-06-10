"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { formatPrice, type Product } from "../lib/catalog";
import { useShopper } from "../lib/shopper-context";
import { useTracker, useTrackerReady } from "./tracker-provider";
import { trackProductClick } from "../lib/events";

interface ScoreFactor {
  name: string;
  weight: number;
  rawValue: number;
  weightedValue: number;
  contribution: string;
}

interface RailItem {
  product: Product;
  itemId: string;
  score: number;
  confidenceScore: number;
  reasoning: string;
  scoreBreakdown: ScoreFactor[];
  matchedSignals: string[];
}

interface RailResponse {
  traceId: string | null;
  summary: string | null;
  explanation: string | null;
  intentLabel?: string | null;
  queryText?: string | null;
  items: RailItem[];
}

function gradient(color: string): string {
  return `linear-gradient(140deg, ${color} 0%, ${color}cc 45%, ${color}88 100%)`;
}

/**
 * "Recommended for you" — the storefront end of the GlassBox loop. Tracked
 * events flow into the engine; this rail asks the engine's public feed API
 * for ranked picks and every card can explain exactly why it is here.
 */
export function RecommendationRail() {
  const { shopper } = useShopper();
  const tracker = useTracker();
  const trackerReady = useTrackerReady();
  const searchParams = useSearchParams();
  const query = (searchParams.get("q") ?? "").trim();
  const [data, setData] = useState<RailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [openWhy, setOpenWhy] = useState<string | null>(null);

  useEffect(() => {
    if (!trackerReady) return;
    let cancelled = false;
    setLoading(true);
    setOpenWhy(null);

    (async () => {
      try {
        const res = await fetch("/api/recommendations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: shopper.id || "anon",
            limit: 12,
            // When the shopper is searching, the live query drives a
            // personalized re-rank instead of the persona's default intent.
            ...(query ? { queryText: query } : {}),
          }),
        });
        const json = (await res.json()) as RailResponse;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [shopper.id, trackerReady, query]);

  if (loading) {
    return (
      <section className="container rail" aria-busy="true">
        <div className="rail-head">
          <h2>Recommended for {shopper.short || "you"}</h2>
          <span className="rail-tag">GlassBox Engine is ranking…</span>
        </div>
        <div className="rail-scroll">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rail-card rail-skeleton" />
          ))}
        </div>
      </section>
    );
  }

  if (!data || data.items.length === 0) return null;

  return (
    <section className="container rail">
      <div className="rail-head">
        <h2>
          {query
            ? `Search re-ranked for ${shopper.short || "you"}: “${query}”`
            : `Recommended for ${shopper.short || "you"}`}
        </h2>
        <span className="rail-tag" title={data.explanation ?? undefined}>
          ✦ Ranked by GlassBox Engine
          {data.intentLabel ? ` · ${data.intentLabel}` : ""}
          {data.traceId ? ` · trace ${data.traceId.slice(0, 18)}…` : ""}
        </span>
      </div>

      <div className="rail-scroll">
        {data.items.map((item) => (
          <div key={item.itemId} className="rail-card">
            <Link
              href={`/product/${item.product.id}`}
              className="rail-link"
              onClick={() => trackProductClick(tracker, item.product)}
            >
              <div
                className="rail-art"
                style={{ background: gradient(item.product.color) }}
              >
                <span aria-hidden>{item.product.emoji}</span>
              </div>
              <div className="rail-name">{item.product.name}</div>
              <div className="rail-foot">
                <span className="price">{formatPrice(item.product.price)}</span>
                <span className="rail-conf">
                  {(item.confidenceScore * 100).toFixed(0)}%
                </span>
              </div>
            </Link>

            <button
              className="why-btn"
              onClick={() =>
                setOpenWhy(openWhy === item.itemId ? null : item.itemId)
              }
              aria-expanded={openWhy === item.itemId}
            >
              {openWhy === item.itemId ? "Hide" : "Why this?"}
            </button>

            {openWhy === item.itemId && (
              <div className="why-pop" role="dialog" aria-label="Why this recommendation">
                <p className="why-reason">{item.reasoning}</p>
                {item.scoreBreakdown.length > 0 && (
                  <div className="why-bars">
                    {item.scoreBreakdown.map((factor) => (
                      <div key={factor.name} className="why-bar-row">
                        <span className="why-bar-label">{factor.name}</span>
                        <span className="why-bar-track">
                          <span
                            className="why-bar-fill"
                            style={{
                              width: `${Math.min(factor.weightedValue * 100, 100)}%`,
                            }}
                          />
                        </span>
                        <span className="why-bar-value">
                          {factor.weightedValue.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {item.matchedSignals.length > 0 && (
                  <p className="why-signals">
                    Signals: {item.matchedSignals.join(", ")}
                  </p>
                )}
                {data.traceId && (
                  <p className="why-trace">Full trace: {data.traceId}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
