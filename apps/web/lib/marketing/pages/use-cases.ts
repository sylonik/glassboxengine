import type { MarketingPage } from "~/lib/marketing/content";

export const page: MarketingPage = {
  "blocks": [
    {
      "type": "prose",
      "heading": "Personalization use cases, built to explain themselves",
      "paragraphs": [
        "Most recommendation engines hand you a ranked list and a shrug. GlassBox Engine gives you the same ranking power plus the part that black boxes leave out: a faithful reasoning trace on every item, a reward function you can re-align in real time, and a way to rank well from day zero — before you have a single real event.",
        "Whatever you rank — products, listings, titles, or parts — the same primitives apply. Align ranking to business intent with live Intent Sliders, pre-warm cold starts with synthetic personas, and ship a per-item score breakdown and trace id with every result. The four use cases below show how explainability, intent alignment, and cold-start play out in each domain."
      ]
    },
    {
      "type": "featureGrid",
      "heading": "Four domains, one explainable core",
      "intro": "A deterministic ranking core in TypeScript, LLM-reasoning agents on Vertex AI, and pgvector retrieval — applied to the catalogs teams actually run.",
      "items": [
        {
          "title": "E-commerce product feeds",
          "accent": "indigo",
          "body": "Run a recommendation engine for ecommerce that balances revenue against discovery instead of one hard-coded click objective. Drag the relevance, diversity, novelty and popularity sliders to compile a versioned PolicySpec, then watch the ranking and its trace move deterministically with you. Launch new SKUs and seasonal categories with Persona Lab so the feed ranks sensibly before real events arrive, and answer 'why was this shown?' with a queryable score breakdown — weight, raw, weighted, contribution — for merchandising and compliance."
        },
        {
          "title": "Online marketplaces",
          "accent": "cyan",
          "body": "Marketplaces juggle buyer relevance, seller fairness and inventory freshness at once. Intent Sliders let you re-align that reward function in real time and version every change with an author, constraints and timestamp — an auditable record of how the ranking shifted. New sellers and long-tail listings get a fair first impression through persona-derived preference vectors, and matchedSignals plus confidenceScore make each placement defensible to both sides of the market."
        },
        {
          "title": "Media & streaming",
          "accent": "emerald",
          "body": "Catalogs turn over fast and fresh titles have no watch history. Persona Lab generates synthetic audiences, simulates their behaviour, and derives preference vectors that rank from day zero, then refines them from real tracked events as they accrue. Tune for binge-depth versus catalog breadth by moving novelty and diversity, and surface a plain reasoning string per title so editorial and growth teams see exactly which signals drove a slot."
        },
        {
          "title": "B2B catalogs",
          "accent": "amber",
          "body": "Technical catalogs reward correctness over popularity. pgvector semantic retrieval with gemini-embedding-001 finds compatible parts and SKUs, while a deterministic weighted re-rank keeps results reproducible and explainable. The Socratic Mentor reviews any custom scoring function before it ships — questioning mathematical soundness, injection risk and performance, and blocking a commit that is unsound — so margin-aware, account-specific ranking stays accountable."
        }
      ]
    },
    {
      "type": "steps",
      "heading": "The same pipeline behind every use case",
      "intro": "align -> rank -> trace. Three deterministic stages, identical across domains.",
      "items": [
        {
          "title": "Align",
          "body": "UI sliders compile to a versioned PolicySpec — a normalized reward function carrying author, constraints and a timestamp. You change business intent without redeploying a model."
        },
        {
          "title": "Rank",
          "body": "The Architect translates that policy into a pgvector search plus a deterministic weighted score across every candidate, so the same inputs always produce the same order."
        },
        {
          "title": "Trace",
          "body": "The Reasoner assembles a faithful explanation from the actual inputs and scores — never a prompt-spun story — returned with a traceId you can query later by id."
        }
      ]
    },
    {
      "type": "prose",
      "heading": "Why teams choose explainable over black-box",
      "paragraphs": [
        "Across all four domains the differentiator is the same: trace-first explainability instead of an opaque score, business-intent alignment through reward sliders instead of a single fixed objective, and cold-start coverage through persona simulation instead of waiting on traffic. Every recommendation returns its policy, a per-item scoreBreakdown, matchedSignals, reasoning, a confidenceScore and a traceId.",
        "Three SDK calls cover the surface area — getPersonalizedFeed(userId, { sliders }), getReasoningChain(userId, itemId) and trackEvent({ endUserId, eventType }) — over a typed tRPC SDK and an API-key-authed public API. The ranking core is deterministic and self-hostable, with a built-in ClickHouse event store and Redis/BullMQ pipeline, so personalization stays effective, accountable and aligned to the outcome you actually care about."
      ]
    },
    {
      "type": "cta",
      "heading": "Bring explainable personalization to your catalog",
      "body": "Connect a catalog, align ranking to your business intent, and ship a faithful reasoning trace with every result. Start building, or explore the live demo first.",
      "primaryCtaLabel": "Start building",
      "primaryCtaHref": "/sign-up",
      "secondaryCtaLabel": "Explore the live demo",
      "secondaryCtaHref": "/dashboard"
    }
  ],
  "breadcrumb": [
    {
      "label": "Home",
      "href": "/"
    },
    {
      "label": "Use cases",
      "href": "/use-cases"
    }
  ],
  "description": "Explore personalization use cases for ecommerce, marketplaces, media and B2B catalogs. See how GlassBox Engine adds explainable, intent-aligned recommendations to ship with confidence.",
  "hero": {
    "eyebrow": "Use cases",
    "titleLead": "Personalization use cases that",
    "titleAccent": "explain every rank",
    "sub": "From e-commerce feeds to B2B catalogs, GlassBox Engine pairs deterministic ranking with a faithful reasoning trace, live intent sliders, and cold-start personas — so recommendations are effective and understandable.",
    "primaryCtaLabel": "Start building",
    "primaryCtaHref": "/sign-up",
    "secondaryCtaLabel": "Explore the live demo",
    "secondaryCtaHref": "/dashboard"
  },
  "keywords": [
    "personalization use cases",
    "recommendation engine for ecommerce",
    "explainable recommendation system",
    "marketplace ranking algorithm",
    "cold start recommendations",
    "media streaming personalization",
    "B2B catalog recommendations",
    "intent-aligned ranking"
  ],
  "slug": "/use-cases",
  "title": "Personalization Use Cases & Solutions | GlassBox Engine"
};
