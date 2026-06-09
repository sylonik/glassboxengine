import type { MarketingPage } from "~/lib/marketing/content";

export const page: MarketingPage = {
  "slug": "/features",
  "title": "Explainable Recommendation Features | GlassBox Engine",
  "description": "Explore GlassBox Engine features: reasoning traces, persona cold start, intent sliders, and a Socratic mentor. Recommendation infrastructure you can explain.",
  "keywords": [
    "explainable recommendation system",
    "reasoning traces for recommendations",
    "recommender cold start solution",
    "intent-aligned ranking",
    "reward function sliders",
    "synthetic persona simulation",
    "auditable re-ranking",
    "agentic recommendation infrastructure"
  ],
  "breadcrumb": [
    {
      "label": "Home",
      "href": "/"
    },
    {
      "label": "Features",
      "href": "/features"
    }
  ],
  "hero": {
    "eyebrow": "Features",
    "titleLead": "Personalization that",
    "titleAccent": "explains itself",
    "sub": "GlassBox Engine is explainable, agentic recommendation infrastructure. Connect a catalog, align ranking to business intent with live sliders, pre-warm cold starts with synthetic personas, and ship a faithful reasoning trace with every result.",
    "primaryCtaLabel": "Start building",
    "primaryCtaHref": "/sign-up",
    "secondaryCtaLabel": "Explore the live demo",
    "secondaryCtaHref": "/dashboard"
  },
  "blocks": [
    {
      "type": "prose",
      "heading": "One engine, four problems black boxes leave open",
      "paragraphs": [
        "Most recommenders optimize a single hard-coded objective and hand back an opaque ranked list. GlassBox Engine takes a different posture: a deterministic ranking core and app services in TypeScript on Google Cloud Run, paired with LLM-reasoning agents running as a Python ADK service on Vertex AI Agent Engine. PostgreSQL with pgvector handles semantic retrieval; a deterministic weighted re-rank decides the order.",
        "The result is personalization that is effective and accountable at the same time. Every ranked item carries the factors, weights, and score breakdown that produced it, the reward function is something you steer in real time, and the model can rank from day zero before a single real event arrives.",
        "The four capabilities below are the pillars of the platform. Each has its own deep dive: explainable recommendations at /features/explainable-recommendations, persona-driven cold start at /features/cold-start-personas, intent alignment at /features/intent-alignment, and the Socratic Mentor at /features/socratic-mentor."
      ]
    },
    {
      "type": "featureGrid",
      "heading": "The four pillars",
      "intro": "Explainability, cold start, logic drift, and education — addressed as first-class features, not afterthoughts.",
      "items": [
        {
          "title": "Reasoning Traces",
          "body": "Every ranked item carries a faithful, queryable trace: the factors, the weights, the score breakdown, and the matched signals. No prompt-spun stories — only what the ranking math actually did, retrievable later by trace id.",
          "accent": "indigo"
        },
        {
          "title": "Persona Lab",
          "body": "Pre-warm the model before you have a single real event. Generate synthetic audiences, simulate their behaviour, and derive preference vectors that rank from day zero. Personas can also be built from real tracked events as they accumulate.",
          "accent": "cyan"
        },
        {
          "title": "Intent Sliders",
          "body": "Re-align the reward function in real time. Drag relevance, diversity, novelty, and popularity, and the ranking and its trace move with you, deterministically. Sliders compile to a versioned PolicySpec with author, constraints, and timestamp.",
          "accent": "emerald"
        },
        {
          "title": "Socratic Mentor",
          "body": "Commit a custom scoring function and an agent reviews it like a senior engineer — Socratic questions on mathematical soundness, security and injection risk, and performance — and can block a commit before anything ships.",
          "accent": "amber"
        }
      ]
    },
    {
      "type": "steps",
      "heading": "How a recommendation is made: align, rank, trace",
      "intro": "Three deterministic stages turn business intent into an ordered list you can defend.",
      "items": [
        {
          "title": "Align",
          "body": "UI sliders compile to a versioned PolicySpec — a normalized reward function carrying its author, constraints, and timestamp. This is where business intent across relevance, diversity, novelty, and popularity becomes machine-readable policy."
        },
        {
          "title": "Rank",
          "body": "The Architect translates that policy into a pgvector semantic search plus a deterministic weighted score across every candidate. Embeddings come from gemini-embedding-001 at 768 dimensions, and the same inputs always produce the same order."
        },
        {
          "title": "Trace",
          "body": "The Reasoner assembles a faithful explanation from the actual inputs and scores — per-item scoreBreakdown, matchedSignals, reasoning, and a confidenceScore — returned with a traceId you can query again later."
        }
      ]
    },
    {
      "type": "prose",
      "heading": "Why teams choose a glass box over a black box",
      "paragraphs": [
        "Trace-first explainability means accountability is built in, not bolted on: the explanation is a structured readout of the ranking math, not a narrative generated after the fact. Business-intent alignment through reward sliders lets product and growth steer toward revenue, discovery, trust, or margin instead of a single click-through objective.",
        "Cold start is solved by persona simulation, so the model ranks usefully on day one. The re-rank stays deterministic and auditable, the platform is self-hostable, and the Socratic Mentor adds an education layer that catches unsound or unsafe scoring logic before it ships.",
        "Everything is reachable through a typed tRPC SDK and an API-key-authed public API. Three calls cover the surface: getPersonalizedFeed(userId, { sliders }), getReasoningChain(userId, itemId), and trackEvent({ endUserId, eventType }). Events flow through a Redis and BullMQ pipeline into a ClickHouse event store, ready to power analytics and future personas."
      ]
    },
    {
      "type": "cta",
      "heading": "See the trace behind every result",
      "title": "Make every recommendation explain itself",
      "body": "Connect a catalog, steer the reward function, and ship recommendations that come with their own receipts. Start building, or explore the live demo first.",
      "primaryCtaLabel": "Start building",
      "primaryCtaHref": "/sign-up",
      "secondaryCtaLabel": "Explore the live demo",
      "secondaryCtaHref": "/dashboard"
    }
  ]
};
