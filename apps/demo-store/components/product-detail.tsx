"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPrice, type Product } from "../lib/catalog";
import { useTracker } from "./tracker-provider";
import { useCart } from "../lib/cart";
import { trackProductView } from "../lib/events";

function gradient(color: string): string {
  return `linear-gradient(140deg, ${color} 0%, ${color}cc 45%, ${color}88 100%)`;
}

export function ProductDetail({ product }: { product: Product }) {
  const tracker = useTracker();
  const { add } = useCart();
  const router = useRouter();
  const viewed = useRef<string | null>(null);

  // Fire product_view once per product on mount / navigation.
  useEffect(() => {
    if (viewed.current === product.id) return;
    viewed.current = product.id;
    trackProductView(tracker, product);
  }, [tracker, product]);

  function buyNow() {
    add(product, 1);
    router.push("/checkout");
  }

  return (
    <div className="container">
      <nav className="breadcrumb">
        <Link href="/">Home</Link>
        <span aria-hidden>›</span>
        <Link href={`/?q=${encodeURIComponent(product.category)}`}>
          {product.category}
        </Link>
        <span aria-hidden>›</span>
        <span style={{ color: "var(--text)" }}>{product.name}</span>
      </nav>

      <div className="pdp">
        <div
          className="pdp-art"
          style={{ background: gradient(product.color) }}
          aria-label={`${product.name} placeholder image`}
        >
          <span aria-hidden>{product.emoji}</span>
        </div>

        <div className="pdp-info">
          <span className="tag">{product.category}</span>
          <h1>{product.name}</h1>
          <div className="pdp-price">{formatPrice(product.price)}</div>
          <p className="pdp-desc">{product.description}</p>

          <div className="pdp-actions">
            <button
              className="btn btn-primary"
              onClick={() => add(product, 1)}
            >
              Add to cart
            </button>
            <button className="btn btn-accent" onClick={buyNow}>
              Buy now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
