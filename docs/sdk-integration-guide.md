# GlassBox SDK Integration Guide

> How a website integrates GlassBox to give **personalized, explainable feeds** to
> its users — what to call, when to call it, and the recommended strategy.
> Demonstrated live by `apps/demo-store` across three shopper personas.

---

## TL;DR

GlassBox is a **two-sided loop**, not a single API call:

| Side | Package / endpoint | Runs on | Purpose |
| --- | --- | --- | --- |
| **WRITE** (feedback) | `@glassbox/tracker` → `POST /api/t` | the **browser** | stream user behaviour (views, clicks, cart, purchase, search) |
| **READ** (recommendations) | `@glassbox/sdk` → `POST /api/glassbox.feed` | your **server** | ask for a ranked, explained feed for a user |

You do **not** block the user's page on us. Events are fire-and-forget from the
browser; the feed is fetched server-side and rendered as **progressive
enhancement** (if the engine is slow or down, the page still works).

---

## 1. The write side — emit events (in the browser)

Drop the tracker in once. It auto-tracks page views; you call `track()` for the
events that matter to ranking.

```html
<!-- Option A: script tag (zero code) -->
<script src="https://app.glassboxengine.dev/tracker.js"
        data-project="gb_live_xxx"></script>
```

```ts
// Option B: npm, for SPAs (what the demo store does)
import { GlassBoxTracker } from "@glassbox/tracker";

const tracker = GlassBoxTracker.init({
  apiKey: "gb_live_xxx",
  endpoint: "https://app.glassboxengine.dev",
  autoPageViews: true,
});

// Identify the logged-in user so their events attribute to a stable id.
tracker.identify(user.id, { name: user.name, segment: user.segment });

// Emit the events the ranking model reads. Keep property keys stable.
tracker.track("product_view", { productId, category, price, currency });
tracker.track("add_to_cart",  { productId, category, price, quantity, cartValue });
tracker.track("purchase",     { orderId, total, items, categories });
tracker.track("search",       { query, resultCount });
```

**These are non-blocking.** They batch and flush in the background. The user
never waits on a tracker call — including on search (see §4).

---

## 2. The read side — fetch a feed (on your server)

Call the feed from your **backend**, never the browser, so your `gb_live_` key
stays secret. The demo does this in
[`/api/recommendations`](../apps/demo-store/app/api/recommendations/route.ts),
a thin Next.js route that proxies the engine.

```ts
import { GlassBox } from "@glassbox/sdk";

const gb = new GlassBox({
  endpoint: "https://app.glassboxengine.dev",
  apiKey: process.env.GLASSBOX_API_KEY!, // server-only
});

const feed = await gb.getPersonalizedFeed(userId, {
  queryText: "...",      // intent — see §3
  limit: 12,
  sliders: { relevance: 0.9, diversity: 0.2 }, // policy — see §3
});

// feed.items[]  → ranked products with .score, .confidenceScore
// feed.items[].reasoning + .scoreBreakdown + .matchedSignals  → the Glass Box
// feed.traceId  → full reasoning trace, fetchable via getReasoningChain()
```

Every item arrives **with its own explanation** — that's the whole point of
GlassBox. Render a "Why this?" affordance straight from `reasoning` +
`scoreBreakdown` (the demo's recommendation rail does exactly this).

---

## 3. How the feed is actually personalized (read this carefully)

The engine ranks on **two levers it exposes today**:

1. **`queryText`** — embedded and matched against the catalog (relevance).
2. **`sliders`** — the policy weights `relevance / diversity / novelty / popularity`.

> ⚠️ **The `userId` you pass is recorded for the audit trail but does _not_, by
> itself, re-rank the feed.** Same `queryText` + same `sliders` ⇒ same feed,
> regardless of `userId`. (Confirmed in `packages/api` → `glassBox.recommend`:
> it calls the coordinator with `personaId = undefined`.)

So **personalization is a decision _you_ make on your server**: resolve *who this
user is* into an **intent** (a `queryText` + `sliders`), then call the feed.
"Who they are" can come from:

- a **CRM / logged-in segment** you already have (cheapest — rules-based), or
- a **GlassBox persona** the engine built by clustering this user's tracked
  events (each persona carries a `preferenceVector`), or
- both (segment for cold users, persona once enough events accrue).

The demo encodes this in
[`lib/intent.ts`](../apps/demo-store/lib/intent.ts) — one `segment → intent` map:

| Shopper (segment) | queryText (intent) | sliders | Resulting feed |
| --- | --- | --- | --- |
| Ava — **deal-seeker** | "affordable everyday value… home & beauty" | popularity 0.9 | proven, trending, cheap |
| Marcus — **premium** | "premium high-end flagship electronics & fashion" | relevance 0.9 | tight, high-relevance |
| Sam — **browser** | "a diverse mix… across every category" | diversity 0.9, novelty 0.7 | wide, exploratory |

Same engine, same catalog, **different user in → different ranked feed out.**

### Roadmap: automatic per-user vectors

The engine already *builds* per-segment personas with preference vectors and can
"pre-warm" a feed from one (`runCoordinator(..., personaId)`). The missing link
is having `glassBox.recommend` **resolve `endUserId → persona → preferenceVector`
automatically** so integrators get per-user personalization without hand-mapping
segments. Until then, the §3 server-side resolution is the supported pattern.

---

## 4. "Do we call your endpoint when the user searches?"

**Two independent things happen on a search — keep them separate:**

1. **Always fire a `search` _event_** (write side, non-blocking). This is
   feedback that sharpens future personas. It never gates the search UI.

2. **Optionally call the _feed_ with `queryText = the search query`** (read side)
   to get a **personalized re-rank** of results — ranked by relevance to the
   query *and* biased by that user's policy/persona, each result explained.

You do **not** have to route plain keyword search through us. Use your existing
search for the literal match; call the feed when you want
**personalized, explainable ranking** on top. The demo wires both: typing a
query fires the `search` event *and* re-runs the rail with that query, so the
same search produces a differently-ordered, explained feed per shopper.

```ts
// server: search → personalized re-rank
const feed = await gb.getPersonalizedFeed(userId, {
  queryText: searchQuery,        // the user's words
  sliders: resolveIntent(userId).sliders, // their persona bias
});
```

---

## 5. Recommended integration strategy (checklist)

1. **Embed the tracker** site-wide; `identify()` on login. ✅ feedback flowing.
2. **Proxy the feed through your backend** — never expose `gb_live_` to the
   browser. Cache per `(userId, queryText, sliders)` for a few minutes.
3. **Resolve user → intent on your server** (§3). Start with rules-based
   segments; graduate to GlassBox personas as events accrue.
4. **Personalize the homepage rail** with the persona's default intent (no query).
5. **Personalize search** by passing `queryText = the search query` (§4).
6. **Render the Glass Box** — surface `reasoning` + `scoreBreakdown` per item.
   Explainability is the product; don't hide it.
7. **Degrade gracefully** — the feed is progressive enhancement. On any engine
   error, fall back to your default ordering and an empty rail. The demo proxy
   always returns `200 { items: [] }` on failure.
8. **Cold start**: for brand-new / anonymous users with no events, fall back to
   a "trending / popular" intent (high `popularity` slider) until signal builds.

---

## 6. Using the same API key with agentic (MCP) clients

The `gb_live_...` key you use for the SDK also authenticates the **GlassBox MCP endpoint**. Any MCP-capable client — Claude Desktop, a custom ADK agent, the MCP Inspector — can point at `https://glassboxengine.dev/api/mcp` with the same Bearer token and get access to five tools: `get_feed`, `get_catalog`, `get_scoring_config`, `track_events`, and `translate_sliders`.

This is how the GlassBox Python ADK agents (Persona Simulator, Architect) on Vertex AI Agent Engine read live catalog and feed data and write synthetic events back to the platform.

See **[docs/mcp-integration.md](mcp-integration.md)** for the full architecture, per-tool reference, and connection examples.

---

## 7. Live demo: see it per-user

`apps/demo-store` is the reference integration. With the engine running and a
key seeded (`scripts/seed-demo-key.ts`):

- Switch the **shopper** (Ava / Marcus / Sam) — the rail re-ranks per persona.
- Hit **Simulate session** to stream that persona's events into the engine.
- **Search** a term — the rail header flips to "Search re-ranked for <user>"
  and the ordering changes per shopper.
- Click **"Why this?"** on any card — the engine's reasoning + score breakdown.

Verified live: the same `limit:5` request, differentiated only by each persona's
resolved intent, returns three distinct feeds with three distinct engine
explanations ("preferring established/trending" vs "prioritizing highly relevant"
vs "maximizing category diversity").
