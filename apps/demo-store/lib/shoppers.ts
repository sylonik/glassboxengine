import type { Category } from "./catalog";

export interface Shopper {
  /** Stable user id passed to tracker.identify (empty for anonymous) */
  id: string;
  name: string;
  /** Persona segment surfaced to the persona-builder */
  segment: string;
  email: string;
  /** Short label for the dropdown */
  short: string;
  /** Avatar emoji */
  avatar: string;
  /** Categories this persona leans toward in the simulator */
  preferredCategories: Category[];
  /** Price band the persona gravitates to */
  priceBias: "cheap" | "mid" | "premium" | "any";
  /** Rough buy-through rate used by the simulator (0–1) */
  buyPropensity: number;
}

export const SHOPPERS: Shopper[] = [
  {
    id: "ava-bargain",
    name: "Ava — Bargain Hunter",
    segment: "deal-seeker",
    email: "ava@example.com",
    short: "Ava",
    avatar: "💸",
    preferredCategories: ["Home", "Beauty"],
    priceBias: "cheap",
    buyPropensity: 0.9,
  },
  {
    id: "marcus-premium",
    name: "Marcus — Premium Buyer",
    segment: "premium",
    email: "marcus@example.com",
    short: "Marcus",
    avatar: "💎",
    preferredCategories: ["Electronics", "Fashion"],
    priceBias: "premium",
    buyPropensity: 0.85,
  },
  {
    id: "sam-browser",
    name: "Sam — Casual Browser",
    segment: "browser",
    email: "sam@example.com",
    short: "Sam",
    avatar: "👀",
    preferredCategories: ["Electronics", "Home", "Fashion", "Sports", "Books", "Beauty"],
    priceBias: "any",
    buyPropensity: 0.15,
  },
  {
    id: "anon",
    name: "Anonymous",
    segment: "anonymous",
    email: "",
    short: "Anonymous",
    avatar: "👤",
    preferredCategories: ["Electronics", "Home", "Fashion", "Sports", "Books", "Beauty"],
    priceBias: "any",
    buyPropensity: 0.3,
  },
];

export const DEFAULT_SHOPPER_ID = "ava-bargain";

export function getShopper(id: string): Shopper | undefined {
  return SHOPPERS.find((s) => s.id === id);
}

export function isAnonymous(shopper: Shopper): boolean {
  return shopper.id === "anon";
}
