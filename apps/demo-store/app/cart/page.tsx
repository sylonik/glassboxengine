"use client";

import Link from "next/link";
import { useCart } from "../../lib/cart";
import { formatPrice } from "../../lib/catalog";

function tint(color: string): string {
  return `linear-gradient(140deg, ${color} 0%, ${color}aa 100%)`;
}

export default function CartPage() {
  const { items, total, count, remove, setQuantity } = useCart();

  if (items.length === 0) {
    return (
      <div className="container">
        <div className="page-head">
          <h1>Your cart</h1>
        </div>
        <div className="empty">
          <div className="empty-emoji">🛒</div>
          <p>Your cart is empty.</p>
          <Link href="/" className="btn btn-primary" style={{ marginTop: 14 }}>
            Continue shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-head">
        <h1>Your cart</h1>
      </div>

      <div className="layout-2col">
        <div className="panel">
          {items.map(({ product, quantity }) => (
            <div className="line-item" key={product.id}>
              <div className="li-art" style={{ background: tint(product.color) }}>
                <span aria-hidden>{product.emoji}</span>
              </div>
              <div className="li-main">
                <Link href={`/product/${product.id}`} className="li-name">
                  {product.name}
                </Link>
                <div className="li-cat">
                  {product.category} · {formatPrice(product.price)}
                </div>
              </div>
              <div className="qty">
                <button
                  onClick={() => setQuantity(product.id, quantity - 1)}
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span>{quantity}</span>
                <button
                  onClick={() => setQuantity(product.id, quantity + 1)}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
              <div className="price" style={{ width: 80, textAlign: "right" }}>
                {formatPrice(product.price * quantity)}
              </div>
              <button
                className="link-danger"
                onClick={() => remove(product.id)}
                aria-label={`Remove ${product.name}`}
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <aside className="panel panel-pad">
          <div className="summary-row">
            <span>Items</span>
            <span>{count}</span>
          </div>
          <div className="summary-row">
            <span>Shipping</span>
            <span>Free</span>
          </div>
          <div className="summary-total">
            <span>Subtotal</span>
            <span>{formatPrice(total)}</span>
          </div>
          <Link
            href="/checkout"
            className="btn btn-primary btn-block"
            style={{ marginTop: 18 }}
          >
            Checkout
          </Link>
          <Link
            href="/"
            className="btn btn-ghost btn-block"
            style={{ marginTop: 10 }}
          >
            Continue shopping
          </Link>
        </aside>
      </div>
    </div>
  );
}
