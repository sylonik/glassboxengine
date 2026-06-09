"use client";

import Link from "next/link";
import { formatPrice, type Product } from "../lib/catalog";
import { useTracker } from "./tracker-provider";
import { trackProductClick } from "../lib/events";

function gradient(color: string): string {
  return `linear-gradient(140deg, ${color} 0%, ${color}cc 45%, ${color}88 100%)`;
}

export function ProductCard({ product }: { product: Product }) {
  const tracker = useTracker();

  return (
    <Link
      href={`/product/${product.id}`}
      className="card"
      onClick={() => trackProductClick(tracker, product)}
    >
      <div className="card-art" style={{ background: gradient(product.color) }}>
        <span className="card-cat">{product.category}</span>
        <span aria-hidden>{product.emoji}</span>
      </div>
      <div className="card-body">
        <div className="card-name">{product.name}</div>
        <div className="card-foot">
          <span className="price">{formatPrice(product.price)}</span>
          <span className="btn btn-ghost btn-sm" aria-hidden>
            View
          </span>
        </div>
      </div>
    </Link>
  );
}
