export type Category =
  | "Electronics"
  | "Home"
  | "Fashion"
  | "Sports"
  | "Books"
  | "Beauty";

export const CATEGORIES: Category[] = [
  "Electronics",
  "Home",
  "Fashion",
  "Sports",
  "Books",
  "Beauty",
];

export interface Product {
  /** URL-safe slug, e.g. "noise-cancelling-headphones" */
  id: string;
  name: string;
  category: Category;
  /** USD, spread $9–$499 so personas differ */
  price: number;
  description: string;
  /** Representative emoji rendered over the gradient placeholder */
  emoji: string;
  /** Hex color used as the base of the card's gradient placeholder */
  color: string;
}

export const CURRENCY = "USD";

export const PRODUCTS: Product[] = [
  // ---------- Electronics ----------
  {
    id: "noise-cancelling-headphones",
    name: "Aurora Noise-Cancelling Headphones",
    category: "Electronics",
    price: 349,
    description:
      "Studio-grade active noise cancellation, 40-hour battery, and plush memory-foam ear cups. Your commute just went silent.",
    emoji: "🎧",
    color: "#6366f1",
  },
  {
    id: "smart-4k-monitor",
    name: "Lumen 27\" 4K Smart Monitor",
    category: "Electronics",
    price: 449,
    description:
      "A razor-sharp 4K panel with built-in apps, USB-C charging, and a near-borderless design that makes any desk look pro.",
    emoji: "🖥️",
    color: "#0ea5e9",
  },
  {
    id: "wireless-earbuds",
    name: "Pebble Wireless Earbuds",
    category: "Electronics",
    price: 89,
    description:
      "Pocketable, sweat-proof earbuds with punchy bass and a charging case that tops up in minutes.",
    emoji: "🎵",
    color: "#8b5cf6",
  },
  {
    id: "mechanical-keyboard",
    name: "Click75 Mechanical Keyboard",
    category: "Electronics",
    price: 129,
    description:
      "Hot-swappable switches, per-key RGB, and a satisfying tactile thock for people who type all day.",
    emoji: "⌨️",
    color: "#3b82f6",
  },
  // ---------- Home ----------
  {
    id: "ceramic-pour-over",
    name: "Daybreak Ceramic Pour-Over Set",
    category: "Home",
    price: 34,
    description:
      "A hand-glazed dripper and carafe that turns a quiet morning into a slow ritual. Filters included.",
    emoji: "☕",
    color: "#f59e0b",
  },
  {
    id: "linen-throw-blanket",
    name: "Cloud Linen Throw Blanket",
    category: "Home",
    price: 49,
    description:
      "Stonewashed pure linen that gets softer with every wash. Light enough for summer, warm enough for the couch.",
    emoji: "🛋️",
    color: "#d97706",
  },
  {
    id: "scented-soy-candle",
    name: "Ember Scented Soy Candle",
    category: "Home",
    price: 19,
    description:
      "Hand-poured soy wax with notes of cedar and warm vanilla. A 60-hour burn that makes any room feel like home.",
    emoji: "🕯️",
    color: "#ea580c",
  },
  {
    id: "bamboo-cutting-board",
    name: "Grove Bamboo Cutting Board",
    category: "Home",
    price: 24,
    description:
      "Sustainable, knife-friendly bamboo with a juice groove and built-in handle. The workhorse of a tidy kitchen.",
    emoji: "🔪",
    color: "#ca8a04",
  },
  // ---------- Fashion ----------
  {
    id: "merino-overcoat",
    name: "Atlas Merino Wool Overcoat",
    category: "Fashion",
    price: 389,
    description:
      "A tailored, breathable merino overcoat that drapes beautifully and shrugs off a drizzle. Quietly luxurious.",
    emoji: "🧥",
    color: "#0f766e",
  },
  {
    id: "leather-weekender",
    name: "Voyage Full-Grain Leather Weekender",
    category: "Fashion",
    price: 299,
    description:
      "Full-grain leather that ages like a good story. Cavernous main compartment, padded laptop sleeve, brass hardware.",
    emoji: "👜",
    color: "#115e59",
  },
  {
    id: "classic-sneakers",
    name: "Stride Classic Low Sneakers",
    category: "Fashion",
    price: 79,
    description:
      "An everyday low-top in soft suede with a cushioned sole. Goes with everything, says yes to everything.",
    emoji: "👟",
    color: "#14b8a6",
  },
  {
    id: "silk-scarf",
    name: "Meridian Printed Silk Scarf",
    category: "Fashion",
    price: 45,
    description:
      "A featherweight mulberry-silk scarf with a hand-drawn print. The fastest way to make an outfit feel intentional.",
    emoji: "🧣",
    color: "#2dd4bf",
  },
  // ---------- Sports ----------
  {
    id: "carbon-trail-poles",
    name: "Summit Carbon Trail Poles",
    category: "Sports",
    price: 119,
    description:
      "Feather-light carbon poles with cork grips and quick-lock adjustment. Save your knees on every descent.",
    emoji: "🥾",
    color: "#16a34a",
  },
  {
    id: "yoga-mat-pro",
    name: "Flow Pro Cork Yoga Mat",
    category: "Sports",
    price: 69,
    description:
      "Natural cork over recycled rubber for grip that improves as you sweat. Quietly the nicest mat in the studio.",
    emoji: "🧘",
    color: "#22c55e",
  },
  {
    id: "insulated-water-bottle",
    name: "Tundra Insulated Water Bottle",
    category: "Sports",
    price: 29,
    description:
      "Keeps cold drinks cold for 24 hours and hot drinks hot for 12. Leak-proof, dent-proof, gym-bag-proof.",
    emoji: "🧴",
    color: "#15803d",
  },
  {
    id: "running-shorts",
    name: "Pace 2-in-1 Running Shorts",
    category: "Sports",
    price: 39,
    description:
      "Four-way stretch with a zip pocket and a built-in liner. The shorts you forget you're wearing.",
    emoji: "🏃",
    color: "#4ade80",
  },
  // ---------- Books ----------
  {
    id: "the-quiet-algorithm",
    name: "The Quiet Algorithm (Hardcover)",
    category: "Books",
    price: 26,
    description:
      "A sweeping novel about the people behind the machines, and the small choices that quietly reshape the world.",
    emoji: "📕",
    color: "#dc2626",
  },
  {
    id: "cooking-by-feel",
    name: "Cooking by Feel",
    category: "Books",
    price: 32,
    description:
      "Less recipe, more intuition. A gorgeously photographed guide to trusting your hands in the kitchen.",
    emoji: "📗",
    color: "#ef4444",
  },
  {
    id: "pocket-stoic",
    name: "The Pocket Stoic",
    category: "Books",
    price: 12,
    description:
      "Two thousand years of calm, distilled into a pocket-sized field guide for modern anxieties.",
    emoji: "📘",
    color: "#f87171",
  },
  {
    id: "deep-work-journal",
    name: "Deep Work Daily Journal",
    category: "Books",
    price: 18,
    description:
      "A 90-day undated planner built around focus blocks and a single daily question. Paper, on purpose.",
    emoji: "📒",
    color: "#b91c1c",
  },
  // ---------- Beauty ----------
  {
    id: "vitamin-c-serum",
    name: "Glow Vitamin C Serum",
    category: "Beauty",
    price: 28,
    description:
      "A bright, stable vitamin C serum that fades dullness and plays nicely under sunscreen. Lightweight, never sticky.",
    emoji: "✨",
    color: "#db2777",
  },
  {
    id: "hydrating-lip-balm",
    name: "Dew Hydrating Lip Balm",
    category: "Beauty",
    price: 9,
    description:
      "A barely-there tinted balm with shea and squalane. The little thing you reach for a dozen times a day.",
    emoji: "💋",
    color: "#ec4899",
  },
  {
    id: "silk-pillowcase",
    name: "Lull Mulberry Silk Pillowcase",
    category: "Beauty",
    price: 59,
    description:
      "22-momme mulberry silk that's gentle on skin and hair. Wake up with fewer creases and better hair days.",
    emoji: "🛏️",
    color: "#f472b6",
  },
  {
    id: "rose-clay-mask",
    name: "Bloom Rose Clay Mask",
    category: "Beauty",
    price: 22,
    description:
      "French rose clay that draws out the day without stripping your skin. Ten quiet minutes, visibly calmer skin.",
    emoji: "🌹",
    color: "#be185d",
  },
];

export function getProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: CURRENCY,
    minimumFractionDigits: price % 1 === 0 ? 0 : 2,
  }).format(price);
}
