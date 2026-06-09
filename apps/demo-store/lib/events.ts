import type { GlassBoxTracker } from "@glassbox/tracker";
import type { Product } from "./catalog";
import { CURRENCY } from "./catalog";

/**
 * Centralised event-emission layer. Every helper here encodes the EXACT
 * property contract the persona-builder reads downstream. Keep keys stable.
 *
 * `category` and `price` MUST be present on product_view / product_click /
 * add_to_cart and on each purchase line item.
 */

type Tracker = GlassBoxTracker | null;

export interface CartLine {
  product: Product;
  quantity: number;
}

export function trackProductView(tracker: Tracker, product: Product): void {
  tracker?.track("product_view", {
    productId: product.id,
    productName: product.name,
    category: product.category,
    price: product.price,
    currency: CURRENCY,
  });
}

export function trackProductClick(tracker: Tracker, product: Product): void {
  tracker?.track("product_click", {
    productId: product.id,
    productName: product.name,
    category: product.category,
    price: product.price,
    currency: CURRENCY,
  });
}

export function trackSearch(
  tracker: Tracker,
  query: string,
  resultCount: number
): void {
  tracker?.track("search", { query, resultCount });
}

export function trackAddToCart(
  tracker: Tracker,
  product: Product,
  quantity: number,
  cartValue: number
): void {
  tracker?.track("add_to_cart", {
    productId: product.id,
    productName: product.name,
    category: product.category,
    price: product.price,
    quantity,
    cartValue,
  });
}

export function trackRemoveFromCart(tracker: Tracker, product: Product): void {
  tracker?.track("remove_from_cart", {
    productId: product.id,
    productName: product.name,
    category: product.category,
    price: product.price,
  });
}

export function trackCheckoutStart(
  tracker: Tracker,
  cartValue: number,
  itemCount: number,
  categories: string[]
): void {
  tracker?.track("checkout_start", {
    cartValue,
    itemCount,
    categories,
  });
}

export interface PurchaseItem {
  productId: string;
  category: string;
  price: number;
}

export function trackPurchase(
  tracker: Tracker,
  orderId: string,
  total: number,
  itemCount: number,
  items: PurchaseItem[],
  categories: string[]
): void {
  tracker?.track("purchase", {
    orderId,
    total,
    itemCount,
    items,
    categories,
  });
}

/** Distinct category list from a set of cart lines. */
export function uniqueCategories(lines: CartLine[]): string[] {
  return Array.from(new Set(lines.map((l) => l.product.category)));
}

export function generateOrderId(): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `GB-${Date.now().toString(36).toUpperCase()}-${rand}`;
}
