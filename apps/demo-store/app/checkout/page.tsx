"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useCart } from "../../lib/cart";
import { useShopper } from "../../lib/shopper-context";
import { useTracker } from "../../components/tracker-provider";
import { formatPrice } from "../../lib/catalog";
import {
  generateOrderId,
  trackCheckoutStart,
  trackPurchase,
  uniqueCategories,
  type PurchaseItem,
} from "../../lib/events";

export default function CheckoutPage() {
  const { items, total, count, clear } = useCart();
  const { shopper } = useShopper();
  const tracker = useTracker();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [placedOrder, setPlacedOrder] = useState<{
    orderId: string;
    total: number;
    itemCount: number;
  } | null>(null);

  // Prefill from the active shopper (anonymous stays blank).
  useEffect(() => {
    if (shopper.id === "anon") return;
    setName(shopper.short);
    setEmail(shopper.email);
  }, [shopper]);

  // Fire checkout_start once on entry, only when there's a cart to check out.
  const startedFor = useRef<string | null>(null);
  useEffect(() => {
    if (placedOrder) return;
    if (items.length === 0) return;
    const signature = items
      .map((l) => `${l.product.id}x${l.quantity}`)
      .join("|");
    if (startedFor.current === signature) return;
    startedFor.current = signature;
    trackCheckoutStart(tracker, total, count, uniqueCategories(items));
  }, [items, total, count, tracker, placedOrder]);

  function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) return;

    const orderId = generateOrderId();
    const purchaseItems: PurchaseItem[] = items.map((l) => ({
      productId: l.product.id,
      category: l.product.category,
      price: l.product.price,
    }));

    trackPurchase(
      tracker,
      orderId,
      total,
      count,
      purchaseItems,
      uniqueCategories(items)
    );
    tracker?.flush();

    setPlacedOrder({ orderId, total, itemCount: count });
    clear();
  }

  if (placedOrder) {
    return (
      <div className="container">
        <div className="confirm">
          <div className="confirm-check" aria-hidden>
            ✓
          </div>
          <h1>Order confirmed</h1>
          <p>Thanks{shopper.id !== "anon" ? `, ${shopper.short}` : ""}!</p>
          <p>
            {placedOrder.itemCount} item
            {placedOrder.itemCount === 1 ? "" : "s"} ·{" "}
            {formatPrice(placedOrder.total)}
          </p>
          <div className="order-id">{placedOrder.orderId}</div>
          <div>
            <Link href="/" className="btn btn-primary">
              Back to shop
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container">
        <div className="page-head">
          <h1>Checkout</h1>
        </div>
        <div className="empty">
          <div className="empty-emoji">🧾</div>
          <p>There&apos;s nothing to check out yet.</p>
          <Link href="/" className="btn btn-primary" style={{ marginTop: 14 }}>
            Browse products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-head">
        <h1>Checkout</h1>
        <p className="shopper-hint">
          Checking out as {shopper.avatar} {shopper.name}
        </p>
      </div>

      <div className="layout-2col">
        <form className="panel panel-pad" onSubmit={placeOrder}>
          <div className="field">
            <label htmlFor="name">Full name</label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Shopper"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="card">Card number (demo — not charged)</label>
            <input
              id="card"
              inputMode="numeric"
              defaultValue="4242 4242 4242 4242"
              placeholder="4242 4242 4242 4242"
            />
          </div>
          <button
            type="submit"
            className="btn btn-accent btn-block"
            style={{ marginTop: 6 }}
          >
            Place order · {formatPrice(total)}
          </button>
        </form>

        <aside className="panel">
          <div className="section-title">Order summary</div>
          {items.map(({ product, quantity }) => (
            <div className="line-item" key={product.id}>
              <div
                className="li-art"
                style={{
                  background: `linear-gradient(140deg, ${product.color} 0%, ${product.color}aa 100%)`,
                }}
              >
                <span aria-hidden>{product.emoji}</span>
              </div>
              <div className="li-main">
                <div className="li-name">{product.name}</div>
                <div className="li-cat">
                  Qty {quantity} · {product.category}
                </div>
              </div>
              <div className="price" style={{ fontSize: 15 }}>
                {formatPrice(product.price * quantity)}
              </div>
            </div>
          ))}
          <div className="panel-pad">
            <div className="summary-row">
              <span>Items</span>
              <span>{count}</span>
            </div>
            <div className="summary-row">
              <span>Shipping</span>
              <span>Free</span>
            </div>
            <div className="summary-total">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
