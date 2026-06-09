import type { MarketingPage } from "~/lib/marketing/content";

export const page: MarketingPage = {
  "blocks": [
    {
      "type": "prose",
      "heading": "Why teams move off black-box recommenders",
      "paragraphs": [
        "Most recommendation platforms are managed black boxes. You send interaction data, you receive ranked results, and the reasoning that produced each result stays inside someone else's model. That is fine until a stakeholder asks why a product ranked where it did, until a single click-through objective starts working against margin or discovery, or until you need to launch before you have any behavioural data at all.",
        "GlassBox Engine takes a different position. The ranking core is deterministic and runs in your control. Every result carries a faithful reasoning trace built from the actual factors, weights, and score breakdown the math used. The reward function is yours to shape with live sliders, not a single hard-coded goal. And it self-hosts, so the model and its data stay where you put them.",
        "This page compares GlassBox to managed recommendation services on the capabilities that matter when explainability and intent-alignment are requirements rather than nice-to-haves. The competitors below are strong, mature products. The differences are about transparency and control, not quality of engineering."
      ]
    },
    {
      "type": "comparison",
      "heading": "GlassBox vs black-box recommendation engines",
      "intro": "A capability-level comparison. Cells reflect each product's publicly documented design: managed services optimize for hands-off operation, which by design abstracts away the per-recommendation reasoning that GlassBox makes first-class.",
      "columns": [
        "Capability",
        "GlassBox",
        "Amazon Personalize",
        "Algolia Recommend",
        "Vertex AI",
        "Recombee"
      ],
      "rows": [
        {
          "label": "Faithful per-item reasoning traces",
          "cells": [
            "Yes — first-class, queryable by trace id",
            "Limited — pipeline abstracted",
            "Limited — model type named, scoring not exposed",
            "Partial — console score diagnostics, not a per-result trace API",
            "Partial — strategy tooling, core reasoning not exposed"
          ]
        },
        {
          "label": "Business-intent reward sliders (multi-objective)",
          "cells": [
            "Yes — relevance, diversity, novelty, popularity",
            "No — managed objective",
            "Partial — configurable rules",
            "Partial — model/type selection",
            "Partial — business rules, boosting/filtering"
          ]
        },
        {
          "label": "Cold-start via persona simulation",
          "cells": [
            "Yes — synthetic personas pre-warm day-zero ranking",
            "No — needs interaction data",
            "No — driven by click/conversion events",
            "No — trained on catalog + event data",
            "No — needs interaction data"
          ]
        },
        {
          "label": "Deterministic, auditable re-rank",
          "cells": [
            "Yes — weighted score, versioned PolicySpec",
            "No — managed ML model",
            "Partial — rules over ML models",
            "Partial — rules/controls over proprietary models",
            "Partial — rules over ML models"
          ]
        },
        {
          "label": "Self-hostable",
          "cells": [
            "Yes — runs in your cloud",
            "No — AWS managed service",
            "No — managed SaaS",
            "No — Google Cloud service",
            "No — managed SaaS"
          ]
        },
        {
          "label": "Socratic review of scoring code",
          "cells": [
            "Yes — agent reviews and can block a commit",
            "No",
            "No",
            "No",
            "No"
          ]
        },
        {
          "label": "pgvector semantic retrieval",
          "cells": [
            "Yes — Postgres + pgvector, gemini-embedding-001",
            "Managed — embeddings abstracted",
            "Managed — search index",
            "Managed — proprietary",
            "Managed — proprietary"
          ]
        },
        {
          "label": "Typed SDK + built-in events/analytics",
          "cells": [
            "Yes — tRPC SDK, API keys, events, analytics",
            "Yes — SDKs + AWS analytics",
            "Yes — SDKs + dashboards",
            "Yes — SDKs + Cloud analytics",
            "Yes — API + dashboards"
          ]
        }
      ]
    },
    {
      "type": "prose",
      "heading": "How GlassBox is built differently",
      "paragraphs": [
        "The pipeline is align, then rank, then trace. UI sliders compile to a versioned PolicySpec — a normalized reward function with author, constraints, and timestamp. The Architect translates that policy into a pgvector semantic search plus a deterministic weighted score across every candidate. The Reasoner then assembles an explanation from the real inputs and scores, not a prompt-spun story, and stores it against a trace id you can query later.",
        "Architecturally, the deterministic ranking core and app services run in TypeScript on Google Cloud Run, while the LLM-reasoning agents run as a Python ADK service on Vertex AI Agent Engine, coordinated across Reasoner, Mentor, and Persona roles. Because ranking is deterministic, the same policy and inputs always produce the same scores — and the same trace — which is what makes an audit meaningful.",
        "Every recommendation returned by the public, API-key-authed endpoints carries the policy, a per-item scoreBreakdown (weight, raw, weighted, contribution), the matched signals, the reasoning, a confidence score, and a trace id. That is the practical definition of an explainable, intent-aligned alternative."
      ]
    },
    {
      "type": "featureGrid",
      "heading": "Where GlassBox draws the line",
      "items": [
        {
          "title": "Trace-first, not story-first",
          "body": "Reasoning Traces report what the ranking math actually did — factors, weights, score breakdown, matched signals — and stay queryable by trace id. No narratives invented after the fact.",
          "accent": "indigo"
        },
        {
          "title": "Your reward function, in real time",
          "body": "Intent Sliders re-align relevance, diversity, novelty, and popularity on the fly. The ranking and its trace move with you, deterministically, and compile to a versioned PolicySpec.",
          "accent": "cyan"
        },
        {
          "title": "Ranking from day zero",
          "body": "Persona Lab generates synthetic audiences, simulates behaviour, and derives preference vectors so you can rank before a single real event. Personas can also be built from tracked events.",
          "accent": "emerald"
        },
        {
          "title": "A reviewer for your scoring code",
          "body": "Commit a custom scoring function and the Socratic Mentor reviews it like a senior engineer — soundness, injection risk, performance — and can block a commit before anything ships.",
          "accent": "amber"
        }
      ]
    },
    {
      "type": "faq",
      "heading": "Is GlassBox an alternative to these platforms?",
      "items": [
        {
          "q": "Is GlassBox an alternative to Amazon Personalize?",
          "a": "Yes, when you need transparency and control. Amazon Personalize is a fully managed AWS service that builds and serves custom models from your data — fast to operate, but the pipeline and per-recommendation reasoning are abstracted away. GlassBox is self-hostable, ranks deterministically, and returns a faithful, queryable reasoning trace with every result."
        },
        {
          "q": "Is GlassBox an alternative to Algolia Recommend?",
          "a": "For recommendations where you want to shape multiple business objectives and see the scoring, yes. Algolia Recommend offers strong prebuilt model types (Related Products, Frequently Bought Together, Trending) configurable with rules. GlassBox lets you tune relevance, diversity, novelty, and popularity with live sliders that compile to a versioned policy, and exposes the per-item score breakdown behind each result."
        },
        {
          "q": "Is GlassBox an alternative to Vertex AI Search & Recommendations?",
          "a": "It can be, when explainability is a requirement. Vertex AI delivers Google-quality recommendations trained on catalog and event data, and it offers a merchandising console that surfaces per-product relevance and revenue scores for search diagnostics, but the ranking models themselves are proprietary and it does not return a faithful, queryable reasoning trace with every recommendation the way GlassBox does. GlassBox is built on the same cloud foundations — Cloud Run, Vertex AI Agent Engine, and Gemini — yet keeps ranking deterministic and every result fully traceable."
        },
        {
          "q": "Is GlassBox an alternative to Recombee?",
          "a": "Yes, especially for cold start and auditability. Recombee is a real-time API engine with a query language for business rules and is building tooling to help visualize strategies. GlassBox goes further on transparency: a deterministic re-rank, persona-based cold start before you have events, and a per-item trace you can query by id."
        }
      ]
    },
    {
      "type": "cta",
      "heading": "See the trace for yourself",
      "body": "Connect a catalog, align ranking to business intent with live sliders, and ship a faithful reasoning trace with every result. Make every recommendation explain itself.",
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
      "label": "Compare",
      "href": "/compare"
    }
  ],
  "description": "GlassBox Engine is the explainable, intent-aligned alternative to black-box recommenders. Compare faithful reasoning traces, reward sliders, cold-start personas, and a deterministic, self-hostable re-rank.",
  "hero": {
    "eyebrow": "Compare",
    "titleLead": "GlassBox vs",
    "titleAccent": "black-box recommendation engines",
    "sub": "Managed recommenders hide the reasoning behind every result and optimize one objective you can't see. GlassBox returns a faithful, queryable trace for each item, lets you shape the reward function with live sliders, and self-hosts. The transparent, intent-aligned alternative.",
    "primaryCtaLabel": "Start building",
    "primaryCtaHref": "/sign-up",
    "secondaryCtaLabel": "Explore the live demo",
    "secondaryCtaHref": "/dashboard"
  },
  "keywords": [
    "explainable recommendation engine",
    "black-box recommender alternative",
    "Amazon Personalize alternative",
    "Algolia Recommend alternative",
    "Vertex AI recommendations alternative",
    "self-hosted recommendation engine",
    "multi-objective recommendation ranking",
    "recommendation reasoning traces"
  ],
  "slug": "/compare",
  "title": "Compare: GlassBox vs Black-Box Recommenders | GlassBox"
};
