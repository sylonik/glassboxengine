import type { MarketingPage } from "~/lib/marketing/content";

export const page: MarketingPage = {
  "slug": "/about",
  "title": "Explainable AI Personalization Company | GlassBox Engine",
  "description": "GlassBox Engine is the explainable AI personalization company closing the alignment, knowledge, and trust gaps in ML ranking with transparency built in.",
  "keywords": [
    "explainable AI personalization company",
    "explainable recommendation infrastructure",
    "transparent recommender system",
    "auditable ranking engine",
    "aligned personalization platform",
    "reasoning trace recommendations",
    "Google ADK Gemini recommendations",
    "accountable ML personalization"
  ],
  "breadcrumb": [
    {
      "label": "Home",
      "href": "/"
    },
    {
      "label": "About",
      "href": "/about"
    }
  ],
  "hero": {
    "eyebrow": "About GlassBox Engine",
    "titleLead": "We build personalization you can",
    "titleAccent": "actually explain",
    "sub": "GlassBox Engine is explainable, agentic recommendation infrastructure. Connect a catalog, align ranking to business intent with live sliders, pre-warm cold starts with synthetic personas, and ship a faithful reasoning trace with every result.",
    "primaryCtaLabel": "Start building",
    "primaryCtaHref": "/sign-up",
    "secondaryCtaLabel": "Explore the live demo",
    "secondaryCtaHref": "/dashboard"
  },
  "blocks": [
    {
      "type": "prose",
      "heading": "Our mission",
      "paragraphs": [
        "Most recommender systems are black boxes. They rank against a single hard-coded objective, usually click-through, and they cannot tell you why any given item surfaced. That opacity is convenient to ship and expensive to live with: teams cannot align ranking to the outcomes that actually matter, engineers cannot reason about the model they own, and customers are asked to trust a decision no one can inspect.",
        "GlassBox Engine exists to close that distance. We make every recommendation explain itself. A deterministic ranking core produces a faithful, queryable trace for every ranked item, the reward function is yours to shape in real time, and an education layer reviews the math before it ships. Personalization should be effective and understandable, accountable, and aligned to revenue, discovery, trust, and margin, not to a single proxy metric.",
        "We are built by Sylonik. Our tagline is the whole product thesis in one line: make every recommendation explain itself."
      ]
    },
    {
      "type": "featureGrid",
      "heading": "The three gaps we close",
      "intro": "Black-box personalization leaves three structural gaps open. GlassBox Engine was designed to close each one directly, with transparency, simulation, and education.",
      "items": [
        {
          "title": "The alignment gap",
          "accent": "indigo",
          "body": "Recommenders optimize one objective and call it done. GlassBox lets you re-align the reward function in real time: drag relevance, diversity, novelty, and popularity, and the ranking moves with you, deterministically. Those Intent Sliders compile to a versioned PolicySpec, a normalized reward function carrying its author, constraints, and timestamp, so business intent becomes an auditable artifact instead of a buried hyperparameter."
        },
        {
          "title": "The knowledge gap",
          "accent": "cyan",
          "body": "Owning a model you cannot interrogate is its own risk. Every ranked item carries a faithful reasoning trace: the factors, the weights, the score breakdown, the matched signals, queryable later by trace id. There are no prompt-spun stories, only what the ranking math actually did. When you commit a custom scoring function, a Socratic Mentor reviews it like a senior engineer, raising questions on mathematical soundness, security, and performance before anything ships."
        },
        {
          "title": "The trust gap",
          "accent": "emerald",
          "body": "Trust requires evidence, not assurances. Because the re-rank is deterministic and the trace is derived from real inputs and scores, every recommendation is reproducible and defensible to a stakeholder, an auditor, or an end user. The engine is self-hostable, and cold starts are handled honestly through persona simulation rather than guesswork, so the system earns trust from day zero."
        }
      ]
    },
    {
      "type": "prose",
      "heading": "How it works: align, rank, trace",
      "paragraphs": [
        "The pipeline is intentionally legible. First, UI sliders compile to a versioned PolicySpec that encodes your intent as a normalized reward function. Then the Architect translates that policy into a pgvector semantic search and a deterministic weighted score across every candidate. Finally, the Reasoner assembles a faithful explanation from the actual inputs and scores, queryable by trace id.",
        "Cold start is solved before a single real event arrives. The Persona Lab generates synthetic audiences, simulates their behaviour, and derives preference vectors that rank from day zero; personas can also be built from real tracked events as they accumulate. The result is a system that is useful on launch day and only gets sharper with real traffic."
      ]
    },
    {
      "type": "prose",
      "heading": "Built on a deterministic, auditable core",
      "paragraphs": [
        "GlassBox Engine runs a hybrid runtime. The deterministic ranking core and application services are written in TypeScript on Google Cloud Run. The LLM-reasoning agents run as a Python service on Vertex AI Agent Engine, built with Google's Agent Development Kit and Gemini, orchestrated by a Coordinator that delegates to Reasoner, Mentor, and Persona agents.",
        "Semantic retrieval and the weighted re-rank sit on PostgreSQL with pgvector, using the gemini-embedding-001 model at 768 dimensions. Events and analytics are first-class: a ClickHouse event store and a Redis and BullMQ pipeline back the platform, and the public API is key-authenticated. The separation matters. Reasoning is generative, but ranking is not. Scores come from math you can audit, and the language agents only ever explain what that math produced.",
        "Integration is a typed tRPC SDK with three calls: getPersonalizedFeed for a ranked feed under your sliders, getReasoningChain for the full explanation of any item, and trackEvent to feed real behaviour back in. Every recommendation returns its policy, a per-item score breakdown of weight, raw, weighted, and contribution, the matched signals, the reasoning, a confidence score, and a trace id."
      ]
    },
    {
      "type": "cta",
      "title": "Personalization that explains itself",
      "body": "Connect a catalog, shape the reward function, and ship recommendations with a faithful trace attached to every result. Start building, or explore the live demo to see the trace, the sliders, and the persona lab in action.",
      "primaryCtaLabel": "Start building",
      "primaryCtaHref": "/sign-up",
      "secondaryCtaLabel": "Explore the live demo",
      "secondaryCtaHref": "/dashboard"
    }
  ]
};
