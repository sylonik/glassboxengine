import type { MarketingPage } from "~/lib/marketing/content";

export const page: MarketingPage = {
  "blocks": [
    {
      "type": "prose",
      "heading": "Rank from day zero, before a single real event",
      "paragraphs": [
        "The cold start problem is the oldest tax on a recommendation system: with no interaction history, a fresh catalog or a brand-new end user, the model has nothing to rank on. Most teams wait weeks for clickstream to accumulate, ship a popularity fallback in the meantime, and quietly accept poor relevance for every new product and every new visitor.",
        "Persona Lab removes the wait. You generate synthetic audiences, simulate their behaviour against your real catalog, and derive preference vectors that produce useful, ranked, explainable results on launch day. The same machinery later ingests real tracked events, so the personas you start with sharpen into the audiences you actually have.",
        "Because GlassBox is trace-first, a cold-start ranking is never a black box. Every item returned from a persona-warmed model still carries a full scoreBreakdown, matchedSignals, a confidenceScore and a queryable traceId, so you can see exactly why the model recommended what it did on day one."
      ]
    },
    {
      "type": "featureGrid",
      "heading": "What Persona Lab gives you",
      "intro": "Three ways to warm a model that has never seen a real interaction.",
      "items": [
        {
          "title": "Synthetic audiences in minutes",
          "body": "The Persona agent generates synthetic audiences against your connected catalog, gives each a coherent set of preferences, and simulates their behaviour to produce signal where you have none. No waiting for organic clickstream to accumulate.",
          "accent": "emerald"
        },
        {
          "title": "Preference vectors that rank",
          "body": "Simulated behaviour is distilled into preference vectors that feed pgvector semantic retrieval and the deterministic weighted re-rank. The output is a real ranked feed with scores, not a popularity placeholder.",
          "accent": "cyan"
        },
        {
          "title": "Personas from real events",
          "body": "As trackEvent data flows in, build personas from real tracked behaviour and blend them with synthetic ones. Cold start becomes a smooth handoff to live data rather than a hard cutover.",
          "accent": "indigo"
        }
      ]
    },
    {
      "type": "steps",
      "heading": "How cold-start warming works",
      "intro": "Persona Lab feeds the same align -> rank -> trace pipeline that powers live traffic.",
      "items": [
        {
          "title": "Generate a synthetic audience",
          "body": "The Persona agent, part of the Python ADK service on Vertex AI Agent Engine, generates synthetic personas against your real catalog: distinct segments, each with coherent intent and preferences."
        },
        {
          "title": "Simulate behaviour",
          "body": "Each persona is run through simulated interactions, producing the signal a brand-new system otherwise lacks. The simulation is grounded in your actual items, not generic assumptions."
        },
        {
          "title": "Derive preference vectors",
          "body": "Simulated behaviour is reduced to preference vectors using gemini-embedding-001 at 768 dimensions, the same embedding space your catalog lives in for semantic retrieval."
        },
        {
          "title": "Rank and trace from day zero",
          "body": "getPersonalizedFeed returns a ranked feed with a per-item scoreBreakdown and a traceId immediately. As real events arrive via trackEvent, personas can be rebuilt from observed behaviour."
        }
      ]
    },
    {
      "type": "callout",
      "title": "Cold start without losing explainability",
      "body": "A persona-warmed recommendation is still deterministic and auditable. The PolicySpec compiled from your Intent Sliders governs the re-rank whether the signal is synthetic or real, and getReasoningChain(userId, itemId) returns the same faithful trace either way. You never trade understandability for coverage."
    },
    {
      "type": "faq",
      "heading": "Cold start and synthetic personas: FAQ",
      "items": [
        {
          "q": "What is the recommendation cold start problem?",
          "a": "Cold start is the inability to rank well when there is no interaction history: a new catalog, a new end user, or a freshly deployed system has no behavioural signal to learn from. Persona Lab solves it by generating synthetic audiences and deriving preference vectors so the model can rank from day zero."
        },
        {
          "q": "How are synthetic personas different from real users?",
          "a": "Synthetic personas are generated against your real catalog and simulated to produce behavioural signal where none exists yet. They are a starting point, not a permanent stand-in. As real interactions arrive through trackEvent, you build personas from real tracked events and blend or replace the synthetic ones."
        },
        {
          "q": "Do persona-warmed recommendations still produce reasoning traces?",
          "a": "Yes. Cold-start results run through the same deterministic weighted re-rank as live traffic, so every item carries a scoreBreakdown, matchedSignals, a confidenceScore and a queryable traceId. You can audit exactly why an item ranked on launch day."
        },
        {
          "q": "How do personas transition to real data over time?",
          "a": "trackEvent feeds the ClickHouse event store and the Redis and BullMQ pipeline. Once real behaviour accumulates, derive preference vectors from observed events and rebuild personas from real data, so cold start becomes a gradual handoff rather than a hard cutover."
        }
      ]
    },
    {
      "type": "cta",
      "title": "Warm your model before launch",
      "body": "Connect a catalog, generate synthetic audiences, and ship ranked, explainable recommendations from day zero with GlassBox Engine.",
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
      "label": "Features",
      "href": "/features"
    },
    {
      "label": "Cold Start & Personas",
      "href": "/features/cold-start-personas"
    }
  ],
  "description": "Solve recommendation cold start with synthetic personas: generate audiences, simulate behaviour, derive preference vectors that rank from day zero, and build personas from real events with GlassBox.",
  "hero": {
    "eyebrow": "Cold Start — Persona Lab",
    "titleLead": "Solve recommendation cold start with",
    "titleAccent": "synthetic personas that rank from day zero",
    "sub": "Pre-warm the model before you have a single real event. Generate synthetic audiences, simulate their behaviour, and derive preference vectors that produce ranked, explainable results on launch day — then rebuild personas from real tracked events as they arrive."
  },
  "keywords": [
    "recommendation cold start",
    "synthetic personas",
    "cold start personalization",
    "preference vectors",
    "persona simulation",
    "recommendation system day zero",
    "cold start recommender",
    "synthetic audience generation"
  ],
  "slug": "/features/cold-start-personas",
  "title": "Recommendation Cold Start & Synthetic Personas | GlassBox"
};
