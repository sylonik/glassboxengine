import type { GlassBoxTracker } from "@glassbox/tracker";
import { PRODUCTS, type Category, type Product } from "./catalog";
import { SHOPPERS, getShopper, isAnonymous, type Shopper } from "./shoppers";
import {
  generateOrderId,
  trackAddToCart,
  trackCheckoutStart,
  trackProductView,
  trackPurchase,
  type PurchaseItem,
} from "./events";

export interface SimProgress {
  /** Current shopper being simulated (display name) */
  shopper: string;
  /** Human-readable step label */
  step: string;
  /** 0–1 completion of the whole run */
  fraction: number;
}

type ProgressCb = (p: SimProgress) => void;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitter(min = 150, max = 400): number {
  return Math.round(min + Math.random() * (max - min));
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Products matching a shopper's preferred categories + price band. */
function biasedProducts(shopper: Shopper): Product[] {
  const inCategory = (c: Category) =>
    shopper.preferredCategories.includes(c);

  const matchesBand = (price: number): boolean => {
    switch (shopper.priceBias) {
      case "cheap":
        return price <= 49;
      case "mid":
        return price > 49 && price <= 149;
      case "premium":
        return price >= 120;
      default:
        return true;
    }
  };

  let pool = PRODUCTS.filter((p) => inCategory(p.category) && matchesBand(p.price));
  if (pool.length < 3) {
    // Relax the band but keep category bias so the run still has variety.
    pool = PRODUCTS.filter((p) => inCategory(p.category));
  }
  if (pool.length < 3) pool = [...PRODUCTS];
  return shuffle(pool);
}

/**
 * Run one realistic scripted session for a single shopper:
 *   identify → several product_views → a couple add_to_cart →
 *   one checkout_start → (maybe) one purchase → flush.
 */
async function simulateShopper(
  tracker: GlassBoxTracker,
  shopper: Shopper,
  onProgress: ProgressCb,
  baseFraction: number,
  span: number
): Promise<void> {
  const report = (step: string, local: number) =>
    onProgress({
      shopper: shopper.short,
      step,
      fraction: Math.min(1, baseFraction + span * local),
    });

  // 1. identify (skip for anonymous)
  if (!isAnonymous(shopper)) {
    tracker.identify(shopper.id, {
      name: shopper.name,
      segment: shopper.segment,
    });
    report(`Signed in as ${shopper.short}`, 0.05);
    await delay(jitter());
  } else {
    report("Browsing anonymously", 0.05);
    await delay(jitter());
  }

  const pool = biasedProducts(shopper);

  // 2. product views — browsers view many, others a handful.
  const viewCount =
    shopper.priceBias === "any" && shopper.buyPropensity < 0.2
      ? Math.min(pool.length, 6 + Math.floor(Math.random() * 3)) // Sam: 6–8
      : Math.min(pool.length, 3 + Math.floor(Math.random() * 2)); // others: 3–4

  const viewed: Product[] = [];
  for (let i = 0; i < viewCount; i++) {
    const product = pool[i % pool.length];
    viewed.push(product);
    trackProductView(tracker, product);
    report(`Viewing ${product.name}`, 0.1 + (0.45 * (i + 1)) / viewCount);
    await delay(jitter());
  }

  // 3. add to cart — premium buyers grab 1–2, bargain hunter 1, browser 0–1.
  const cart: { product: Product; quantity: number }[] = [];
  const maxAdds =
    shopper.priceBias === "premium"
      ? 1 + (Math.random() < 0.5 ? 1 : 0)
      : 1;
  const willAdd = Math.random() < shopper.buyPropensity || maxAdds >= 1;

  if (willAdd) {
    const candidates = shuffle(viewed).slice(0, maxAdds);
    for (const product of candidates) {
      const quantity = 1;
      cart.push({ product, quantity });
      const cartValue = cart.reduce(
        (s, l) => s + l.product.price * l.quantity,
        0
      );
      trackAddToCart(tracker, product, quantity, cartValue);
      report(`Added ${product.name} to cart`, 0.6);
      await delay(jitter());
    }
  }

  // 4. checkout_start + purchase, gated by buy propensity (browsers rarely buy).
  const willBuy =
    cart.length > 0 && Math.random() < shopper.buyPropensity;

  if (cart.length > 0) {
    const cartValue = cart.reduce(
      (s, l) => s + l.product.price * l.quantity,
      0
    );
    const categories = Array.from(new Set(cart.map((l) => l.product.category)));
    const itemCount = cart.reduce((s, l) => s + l.quantity, 0);

    if (willBuy) {
      trackCheckoutStart(tracker, cartValue, itemCount, categories);
      report("Entering checkout", 0.8);
      await delay(jitter());

      const items: PurchaseItem[] = cart.map((l) => ({
        productId: l.product.id,
        category: l.product.category,
        price: l.product.price,
      }));
      trackPurchase(
        tracker,
        generateOrderId(),
        cartValue,
        itemCount,
        items,
        categories
      );
      report(`Purchased ${itemCount} item(s)`, 0.95);
      await delay(jitter());
    } else {
      report("Abandoned cart (just browsing)", 0.9);
      await delay(jitter());
    }
  } else {
    report("Left without adding anything", 0.9);
    await delay(jitter());
  }

  await tracker.flush();
  report("Session flushed", 1);
}

/** Simulate a single shopper's session. */
export async function runSimulation(
  tracker: GlassBoxTracker,
  shopperId: string,
  onProgress: ProgressCb
): Promise<void> {
  const shopper = getShopper(shopperId) ?? pickRandom(SHOPPERS);
  await simulateShopper(tracker, shopper, onProgress, 0, 1);
}

/** Simulate every non-anonymous shopper in sequence to fill the dashboard. */
export async function runAllSimulations(
  tracker: GlassBoxTracker,
  onProgress: ProgressCb
): Promise<void> {
  const roster = SHOPPERS.filter((s) => !isAnonymous(s));
  const span = 1 / roster.length;
  for (let i = 0; i < roster.length; i++) {
    await simulateShopper(tracker, roster[i], onProgress, i * span, span);
  }
}
