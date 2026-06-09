import type { MarketingPage } from "~/lib/marketing/content";

export const page: MarketingPage = {
  "blocks": [
    {
      "type": "prose",
      "heading": "Pricing that starts at free",
      "paragraphs": [
        "GlassBox Engine is free to start. Connect a catalog, align ranking to business intent with live sliders, pre-warm cold starts with synthetic personas, and ship a faithful reasoning trace with every result — all on a generous local and development tier, with no card required.",
        "Pricing scales with how much you put into production, not with how much you want to understand your own ranking. Reasoning traces, intent sliders, the Persona Lab, and the Socratic Mentor are part of the product on every tier. You move up when you need production scale, more catalogs and API keys, and built-in analytics.",
        "We keep dollar figures off this page on purpose. Production and enterprise needs vary by catalog size, event volume, and deployment model, so we size a plan with you directly instead of forcing you into a number that does not fit."
      ]
    },
    {
      "type": "featureGrid",
      "heading": "Three tiers, one engine",
      "intro": "Every tier runs the same hybrid runtime: a deterministic TypeScript ranking core on Cloud Run and Python ADK reasoning agents on Vertex AI Agent Engine. You are never paying for a different, lesser algorithm — only for scale and support.",
      "items": [
        {
          "title": "Free",
          "accent": "emerald",
          "body": "Start building today. The core deterministic re-rank, pgvector semantic retrieval, intent sliders, the Persona Lab, and a faithful reasoning trace for every result — on a generous local and development allowance. Typed tRPC SDK, API keys, and event tracking included. No credit card to begin."
        },
        {
          "title": "Pro",
          "accent": "indigo",
          "body": "Production scale for live traffic: more catalogs, more API keys, and built-in event analytics on the ClickHouse store. Versioned PolicySpecs, queryable traces by trace id, and the Socratic Mentor reviewing your custom scoring functions before they ship. Talk to us to size it — visit /contact."
        },
        {
          "title": "Enterprise",
          "accent": "amber",
          "body": "Self-hosted or managed deployment, SSO, and direct support. Run the deterministic core and ADK agents inside your own environment for full data control and auditability, with onboarding and a named contact. Reach lahiru@sylonik.se to scope it."
        }
      ]
    },
    {
      "type": "prose",
      "heading": "What you get on every plan",
      "paragraphs": [
        "Trace-first explainability is not an add-on. Each recommendation returns its policy, a per-item scoreBreakdown (weight, raw, weighted, contribution), the matchedSignals, the reasoning, a confidenceScore, and a traceId you can query later — on Free as on Enterprise.",
        "The same three SDK calls power every tier: getPersonalizedFeed(userId, { sliders }) to rank, getReasoningChain(userId, itemId) to explain, and trackEvent({ endUserId, eventType }) to learn. Upgrading changes your scale and support, never your integration."
      ]
    },
    {
      "type": "faq",
      "heading": "Pricing questions",
      "items": [
        {
          "q": "Is there really a free tier?",
          "a": "Yes. GlassBox Engine is free to start with a generous local and development allowance — the full deterministic ranking core, intent sliders, the Persona Lab, and a faithful reasoning trace on every result. No credit card is required to begin building."
        },
        {
          "q": "How does billing work?",
          "a": "Free needs no card. Pro is sized to your production scale — catalogs, API keys, and event volume — so we set it up with you directly through /contact rather than publishing a fixed number that rarely fits a real catalog."
        },
        {
          "q": "Can I self-host GlassBox Engine?",
          "a": "Yes, on the Enterprise tier. The deterministic TypeScript ranking core and the Python ADK reasoning agents can run inside your own environment, with SSO and direct support, so your event data and traces never leave your control. Email lahiru@sylonik.se to scope it."
        },
        {
          "q": "What happens when I outgrow the free tier?",
          "a": "Move to Pro for production scale — more catalogs, more keys, and built-in analytics — without changing your integration. The same three SDK calls and the same trace-first contract carry straight over."
        }
      ]
    },
    {
      "type": "cta",
      "heading": "Start free, scale when you are ready",
      "body": "Stand up explainable, intent-aligned recommendations on the free tier today. When you reach production scale, we will size Pro or Enterprise with you.",
      "primaryCtaLabel": "Start building",
      "primaryCtaHref": "/sign-up",
      "secondaryCtaLabel": "Talk to us",
      "secondaryCtaHref": "/contact"
    }
  ],
  "breadcrumb": [
    {
      "label": "Home",
      "href": "/"
    },
    {
      "label": "Pricing",
      "href": "/pricing"
    }
  ],
  "description": "GlassBox Engine pricing: free to start with core ranking and reasoning traces, Pro for production scale and analytics, and self-hosted Enterprise with SSO. Personalization you can explain.",
  "hero": {
    "eyebrow": "Pricing",
    "titleLead": "Explainable recommendations,",
    "titleAccent": "free to start",
    "sub": "Connect a catalog, align ranking with live intent sliders, and ship a faithful reasoning trace on every result — on a generous free tier. Scale to Pro for production volume, or run it self-hosted on Enterprise.",
    "primaryCtaLabel": "Start building",
    "primaryCtaHref": "/sign-up",
    "secondaryCtaLabel": "Explore the live demo",
    "secondaryCtaHref": "/dashboard"
  },
  "keywords": [
    "GlassBox Engine pricing",
    "explainable recommendation engine pricing",
    "recommendation infrastructure pricing",
    "free recommendation engine tier",
    "self-hosted recommendation engine",
    "agentic recommendation platform pricing",
    "reasoning trace recommendation pricing",
    "personalization engine plans"
  ],
  "slug": "/pricing",
  "title": "Pricing — Free to Start with GlassBox Engine"
};
