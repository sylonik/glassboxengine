import type { MarketingPage } from "~/lib/marketing/content";

export const page: MarketingPage = {
  "blocks": [
    {
      "type": "prose",
      "heading": "GlassBox Engine FAQ",
      "intro": "Common questions about explainable, agentic recommendation infrastructure.",
      "paragraphs": [
        "GlassBox Engine is recommendation infrastructure for teams that need personalization to be effective and accountable. The questions below cover how the engine works, the technology behind it, how the SDK fits into your application, and how to get started.",
        "If your question is not answered here, reach out at lahiru@sylonik.se and we will help."
      ]
    },
    {
      "type": "faq",
      "heading": "Frequently asked questions",
      "items": [
        {
          "q": "What is GlassBox Engine?",
          "a": "GlassBox Engine is explainable, agentic recommendation infrastructure built by Sylonik. You connect a catalog, align ranking to business intent with live sliders, pre-warm cold starts with synthetic personas, and ship a faithful reasoning trace with every result. The goal is personalization that is not just effective but understandable, accountable, and aligned to revenue, discovery, trust, and margin."
        },
        {
          "q": "What makes recommendations explainable?",
          "a": "Every ranked item carries a faithful, queryable reasoning trace: the factors, the weights, the score breakdown, and the matched signals. The explanation is assembled from the actual inputs and scores the ranking math produced, not a prompt-spun story written after the fact. Each trace has a traceId, so you can query the reasoning for any recommendation later."
        },
        {
          "q": "How does cold start work without any user data?",
          "a": "The Persona Lab pre-warms the model before you have a single real event. You generate synthetic audiences, simulate their behaviour, and derive preference vectors that rank from day zero. As real events arrive, personas can also be built from your actual tracked behaviour."
        },
        {
          "q": "What is an intent slider and the reward function?",
          "a": "Intent sliders let you re-align the reward function in real time by dragging relevance, diversity, novelty, and popularity. The ranking and its trace move with you, deterministically, instead of optimizing one hard-coded objective like click-through. Under the hood the sliders compile to a versioned PolicySpec: a normalized reward function with an author, constraints, and a timestamp."
        },
        {
          "q": "What is the Socratic Mentor?",
          "a": "The Socratic Mentor is the education layer. When you commit a custom scoring function, an agent reviews it like a senior engineer, asking Socratic questions about mathematical soundness, security and injection risks, and performance. It can block a commit before anything ships."
        },
        {
          "q": "How does the align, rank, trace pipeline work?",
          "a": "First, the UI sliders compile to a versioned PolicySpec. Next, the Architect translates that policy into a pgvector search plus a deterministic weighted score across every candidate. Finally, the Reasoner assembles a faithful explanation from the actual inputs and scores, queryable by traceId."
        },
        {
          "q": "What models and technology does GlassBox use?",
          "a": "GlassBox runs a hybrid runtime: a deterministic ranking core and app services in TypeScript on Google Cloud Run, plus LLM-reasoning agents as a Python service on Vertex AI Agent Engine, built with Google's Agent Development Kit (ADK) and Gemini. The agent topology is a Coordinator routing to a Reasoner, Mentor, and Persona agent. Retrieval uses PostgreSQL with pgvector and the gemini-embedding-001 model at 768 dimensions, with a ClickHouse event store and a Redis and BullMQ pipeline behind the scenes."
        },
        {
          "q": "How does the SDK work?",
          "a": "GlassBox ships a typed tRPC SDK with three core calls: getPersonalizedFeed(userId, { sliders }) to fetch a ranked feed, getReasoningChain(userId, itemId) to retrieve an item's explanation, and trackEvent({ endUserId, eventType }) to record behaviour. The public API is API-key authed, and each recommendation returns a policy, per-item scoreBreakdown (weight, raw, weighted, contribution), matchedSignals, reasoning, confidenceScore, and a traceId."
        },
        {
          "q": "How does GlassBox compare to a black-box recommender?",
          "a": "Black-box engines return a ranked list with no faithful account of why, optimize a single hard-coded objective, and struggle from cold start. GlassBox is trace-first, aligns ranking to business intent through reward sliders rather than one fixed objective, pre-warms cold start with persona simulation, and produces a deterministic, auditable re-rank. It also adds an education layer through the Socratic Mentor."
        },
        {
          "q": "Is GlassBox self-hostable, and how is data handled?",
          "a": "Yes. GlassBox is self-hostable, so you can run the ranking core, retrieval, and event store within your own environment. The architecture uses your PostgreSQL with pgvector for retrieval and a ClickHouse event store for analytics, and the re-rank is deterministic and auditable. For specific deployment or data-handling requirements, contact lahiru@sylonik.se."
        },
        {
          "q": "How do I get started or contact the team?",
          "a": "Create an account to start building, or explore the live demo to see the engine, traces, and sliders in action before you connect a catalog. Integration is three SDK calls: align with sliders, rank a feed, and read the reasoning chain. For questions, custom requirements, or a conversation about your use case, email lahiru@sylonik.se."
        }
      ]
    },
    {
      "type": "cta",
      "title": "Make every recommendation explain itself",
      "body": "Connect a catalog, align ranking to your business intent, and ship a faithful reasoning trace with every result.",
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
      "label": "FAQ",
      "href": "/faq"
    }
  ],
  "description": "Answers to common questions about GlassBox Engine: explainable reasoning traces, cold-start personas, intent sliders, self-hosting, the SDK, and how to get started.",
  "hero": {
    "eyebrow": "FAQ",
    "titleLead": "Questions about explainable",
    "titleAccent": "agentic recommendations",
    "sub": "How GlassBox Engine works, the technology behind it, and how to ship recommendations that explain themselves."
  },
  "keywords": [
    "explainable recommendation engine",
    "reasoning trace recommendations",
    "recommendation system FAQ",
    "cold start personalization",
    "intent slider reward function",
    "self-hosted recommender",
    "pgvector recommendation infrastructure",
    "agentic recommendations",
    "GlassBox Engine FAQ"
  ],
  "slug": "/faq",
  "title": "GlassBox Engine FAQ: Explainable Recommendations"
};
