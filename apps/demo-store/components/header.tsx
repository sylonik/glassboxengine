"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useShopper } from "../lib/shopper-context";
import { useCart } from "../lib/cart";
import { SimControl } from "./sim-control";

export function Header() {
  const { shopper, shoppers, setShopper } = useShopper();
  const { count } = useCart();
  const router = useRouter();

  // Header search is global: it routes to the home grid with ?q=.
  // We intentionally don't read useSearchParams here so the header can live in
  // the root layout without forcing a Suspense boundary / static bailout.
  const [query, setQuery] = useState("");

  function submitSearch(value: string) {
    const trimmed = value.trim();
    const href = trimmed ? `/?q=${encodeURIComponent(trimmed)}` : "/";
    router.push(href);
  }

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="brand">
          <span className="brand-mark">◭</span>
          <span>Glassbox Demo Store</span>
        </Link>

        <div className="header-search">
          <form
            className="search-wrap"
            onSubmit={(e) => {
              e.preventDefault();
              submitSearch(query);
            }}
          >
            <span className="search-icon" aria-hidden>
              🔍
            </span>
            <input
              className="search-input"
              type="search"
              placeholder="Search products…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search products"
            />
          </form>
        </div>

        <div className="header-actions">
          <SimControl />

          <select
            className="select"
            value={shopper.id}
            onChange={(e) => setShopper(e.target.value)}
            aria-label="Switch shopper"
            title="Switch the active shopper (drives user attribution)"
          >
            {shoppers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.avatar} {s.short}
              </option>
            ))}
          </select>

          <Link href="/cart" className="cart-link" aria-label="View cart">
            🛒
            {count > 0 && <span className="cart-badge">{count}</span>}
          </Link>
        </div>
      </div>
    </header>
  );
}
