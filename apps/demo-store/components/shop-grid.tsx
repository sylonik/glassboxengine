"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CATEGORIES, PRODUCTS, type Category } from "../lib/catalog";
import { ProductCard } from "./product-card";
import { useTracker } from "./tracker-provider";
import { trackSearch } from "../lib/events";

type Filter = "All" | Category;

export function ShopGrid() {
  const tracker = useTracker();
  const searchParams = useSearchParams();
  const query = (searchParams.get("q") ?? "").trim();
  const [category, setCategory] = useState<Filter>("All");

  const lowerQuery = query.toLowerCase();

  const filtered = useMemo(() => {
    return PRODUCTS.filter((p) => {
      const matchesCategory = category === "All" || p.category === category;
      const matchesQuery =
        lowerQuery === "" ||
        p.name.toLowerCase().includes(lowerQuery) ||
        p.category.toLowerCase().includes(lowerQuery) ||
        p.description.toLowerCase().includes(lowerQuery);
      return matchesCategory && matchesQuery;
    });
  }, [category, lowerQuery]);

  // Emit a `search` event when the query changes (debounced via URL push).
  const lastSearched = useRef<string | null>(null);
  useEffect(() => {
    if (query === "") {
      lastSearched.current = null;
      return;
    }
    if (lastSearched.current === query) return;
    lastSearched.current = query;
    // Count against the active category view the user is looking at.
    const resultCount = PRODUCTS.filter((p) => {
      const lq = query.toLowerCase();
      return (
        p.name.toLowerCase().includes(lq) ||
        p.category.toLowerCase().includes(lq) ||
        p.description.toLowerCase().includes(lq)
      );
    }).length;
    trackSearch(tracker, query, resultCount);
  }, [query, tracker]);

  return (
    <div className="container">
      <section className="hero">
        <h1>Shop the Glassbox Demo Store</h1>
        <p>
          Browse, search, and check out — every interaction streams into the
          Glassbox engine as a tracked event. Switch shoppers or hit{" "}
          <strong>Simulate session</strong> to watch personas take shape.
        </p>
      </section>

      <div className="chips">
        {(["All", ...CATEGORIES] as Filter[]).map((c) => (
          <button
            key={c}
            className={`chip${category === c ? " active" : ""}`}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>

      {query && (
        <p className="shopper-hint">
          {filtered.length} result{filtered.length === 1 ? "" : "s"} for
          &ldquo;{query}&rdquo;
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="empty">
          <div className="empty-emoji">🔍</div>
          <p>No products match your search. Try a different term or category.</p>
        </div>
      ) : (
        <div className="grid">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
