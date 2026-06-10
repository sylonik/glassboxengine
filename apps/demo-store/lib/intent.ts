import { getShopper, type Shopper } from "./shoppers";

/**
 * Server-side "segment → intent" resolver.
 *
 * This is the crux of how a real website drives a *personalized* feed from the
 * GlassBox engine. The engine's `/api/glassbox.feed` ranks by two levers it
 * exposes today: the `queryText` (embedding relevance) and the policy `sliders`
 * (relevance / diversity / novelty / popularity). The `userId` is recorded for
 * the audit trail but does NOT, by itself, re-rank the feed.
 *
 * So an integrator personalizes by resolving *who the user is* on their own
 * server — from a CRM segment, a logged-in profile, or a GlassBox persona — and
 * translating that into an intent (queryText + sliders) before calling the feed.
 * The demo does exactly that here, deriving the intent from each shopper's
 * segment, preferred categories and price band. Same engine, same catalog —
 * different user in, different ranked feed out.
 */

export interface FeedSliders {
  relevance: number;
  diversity: number;
  novelty: number;
  popularity: number;
}

export interface ResolvedIntent {
  /** The recommendation query handed to the engine (the user's "shape"). */
  queryText: string;
  /** Policy sliders that bias the ranking toward this segment's behaviour. */
  sliders: FeedSliders;
  /** Short human label shown in the rail so the demo is self-explaining. */
  label: string;
}

/**
 * Per-segment intent. Each profile is a plausible server-side translation of
 * "this is the kind of shopper we're serving" into engine ranking levers:
 *
 *   - deal-seeker  → cheap, proven, popular essentials (popularity-led)
 *   - premium      → flagship, high-relevance, low-diversity (relevance-led)
 *   - browser      → wide, exploratory, novel picks (diversity/novelty-led)
 *   - anonymous    → safe popular bestsellers (no history to lean on)
 */
const SEGMENT_INTENT: Record<string, ResolvedIntent> = {
  "deal-seeker": {
    queryText:
      "affordable everyday value deals and bestselling essentials for home and beauty",
    sliders: { relevance: 0.5, diversity: 0.3, novelty: 0.1, popularity: 0.9 },
    label: "value-led picks",
  },
  premium: {
    queryText:
      "premium high-end flagship electronics and designer fashion, top quality",
    sliders: { relevance: 0.9, diversity: 0.2, novelty: 0.5, popularity: 0.3 },
    label: "premium-led picks",
  },
  browser: {
    queryText:
      "a diverse mix of interesting products to explore across every category",
    sliders: { relevance: 0.3, diversity: 0.9, novelty: 0.7, popularity: 0.4 },
    label: "exploratory picks",
  },
  anonymous: {
    queryText: "popular trending bestsellers across all categories",
    sliders: { relevance: 0.5, diversity: 0.5, novelty: 0.2, popularity: 0.8 },
    label: "trending picks",
  },
};

const FALLBACK: ResolvedIntent = SEGMENT_INTENT.anonymous;

/**
 * Resolve a shopper id (the `userId` the storefront sends) into the intent used
 * to call the engine. Falls back to a safe "trending" profile for unknown ids.
 */
export function resolveIntent(userId: string): ResolvedIntent {
  const shopper: Shopper | undefined = getShopper(userId);
  if (!shopper) return FALLBACK;
  return SEGMENT_INTENT[shopper.segment] ?? FALLBACK;
}
