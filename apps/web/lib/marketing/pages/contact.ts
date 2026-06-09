import type { MarketingPage } from "~/lib/marketing/content";

export const page: MarketingPage = {
  "blocks": [
    {
      "type": "prose",
      "heading": "Talk to the team behind GlassBox Engine",
      "paragraphs": [
        "GlassBox Engine is explainable, agentic recommendation infrastructure: connect a catalog, align ranking to business intent with live sliders, pre-warm cold starts with synthetic personas, and ship a faithful reasoning trace with every result. If you want to see that in motion, scope an enterprise or self-hosted deployment, or explore a partnership, we are a direct email away.",
        "GlassBox Engine is designed and built by Sylonik (https://sylonik.se). You reach the people who build the product, not a routing queue. Whether you are an ML engineer evaluating the trace-first re-rank, a product or growth team aligning the reward function to revenue and discovery, or a business deciding between hosted and self-hosted, write to us and we will answer with specifics."
      ]
    },
    {
      "type": "callout",
      "heading": "Email us directly",
      "body": "Reach the GlassBox Engine team at lahiru@sylonik.se. Tell us your catalog, your stack, and what you want personalization to optimize for, and we will reply with a concrete next step. Built by Sylonik (https://sylonik.se).",
      "primaryCtaLabel": "Email lahiru@sylonik.se",
      "primaryCtaHref": "mailto:lahiru@sylonik.se",
      "secondaryCtaLabel": "Explore the live demo",
      "secondaryCtaHref": "/dashboard"
    },
    {
      "type": "featureGrid",
      "heading": "What to reach out about",
      "intro": "Three common reasons teams contact us. Pick the one that fits and we will tailor the conversation.",
      "items": [
        {
          "title": "Demos",
          "body": "Walk through the align to rank to trace pipeline on real data: intent sliders compiling to a versioned PolicySpec, the deterministic pgvector re-rank, and the queryable reasoning trace each result carries. Bring a catalog and a goal; we will show the score breakdown, matched signals, and traceId end to end.",
          "accent": "indigo"
        },
        {
          "title": "Enterprise & self-hosting",
          "body": "GlassBox Engine is self-hostable. Talk to us about deploying the deterministic TypeScript ranking core and the Python ADK reasoning agents in your own environment, API-key access, the ClickHouse event store and Redis/BullMQ pipeline, security review, and the Socratic Mentor commit gate for custom scoring functions.",
          "accent": "emerald"
        },
        {
          "title": "Partnerships",
          "body": "Building on top of recommendation infrastructure, integrating the typed tRPC SDK, or exploring a joint go-to-market with Sylonik? We are open to technology and platform partnerships that put explainable, business-aligned ranking in front of more teams.",
          "accent": "cyan"
        }
      ]
    },
    {
      "type": "prose",
      "heading": "What happens after you write",
      "paragraphs": [
        "Send a short note to lahiru@sylonik.se with what you are building and what you want the model to optimize for: relevance, diversity, novelty, popularity, or the revenue, discovery, trust, and margin trade-offs behind them. The more concrete the goal, the more concrete the reply.",
        "If you would rather see the product before you talk, the live demo is open and you can start building against the SDK on day zero using synthetic personas for cold start. Email remains the fastest path to a real human at Sylonik."
      ]
    },
    {
      "type": "cta",
      "heading": "Start building, or just say hello",
      "body": "Spin up a project and ship recommendations that explain themselves, or email the team to scope a demo, enterprise rollout, or partnership. Either way, every result still carries a faithful, queryable reasoning trace.",
      "primaryCtaLabel": "Get started",
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
      "label": "Contact",
      "href": "/contact"
    }
  ],
  "description": "Contact the GlassBox Engine team at lahiru@sylonik.se for demos, enterprise and self-hosting, or partnerships. Built by Sylonik, explainable recommendation infrastructure that reasons.",
  "hero": {
    "eyebrow": "Contact",
    "titleLead": "Reach the team behind",
    "titleAccent": "GlassBox Engine",
    "sub": "Email lahiru@sylonik.se for a demo, an enterprise or self-hosted deployment, or a partnership. GlassBox Engine is built by Sylonik, and you reach the people who build it.",
    "primaryCtaLabel": "Email lahiru@sylonik.se",
    "primaryCtaHref": "mailto:lahiru@sylonik.se",
    "secondaryCtaLabel": "Explore the live demo",
    "secondaryCtaHref": "/dashboard"
  },
  "keywords": [
    "contact GlassBox Engine",
    "contact Sylonik",
    "GlassBox Engine demo request",
    "GlassBox Engine enterprise",
    "self-hosted recommendation engine contact",
    "explainable recommendation infrastructure",
    "GlassBox Engine partnership",
    "Sylonik recommendation infrastructure"
  ],
  "slug": "/contact",
  "title": "Contact GlassBox Engine | Demos, Enterprise & Sylonik"
};
