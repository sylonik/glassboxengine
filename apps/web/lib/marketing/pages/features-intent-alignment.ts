import type { MarketingPage } from "~/lib/marketing/content";

export const page: MarketingPage = {
  "blocks": [
    {
      "type": "prose",
      "heading": "Most recommenders optimize one number. Your business has several.",
      "paragraphs": [
        "A black-box recommender hard-codes a single objective — usually predicted click-through — and ranks every result against it. That works until your priorities shift. You want more catalog discovery this quarter, tighter relevance next quarter, a margin-aware push during a promotion. With a fixed objective, every one of those changes is an offline retrain and a guess about what the model actually did.",
        "GlassBox Engine treats the objective as a control surface, not a constant. The recommendation reward function is exposed as four sliders — relevance, diversity, novelty, and popularity — that you drag in real time. Each move re-weights the deterministic re-rank across your entire candidate set and updates the reasoning trace alongside it, so the ranking and its explanation always agree.",
        "This is business-aligned ranking: the reward function maps to revenue, discovery, trust, and margin goals you can name, version, and defend — not to a single proxy metric you inherited from a library default."
      ]
    },
    {
      "type": "featureGrid",
      "heading": "What you control, and what stays fixed",
      "intro": "Four reward weights move the ranking. Everything downstream of them is deterministic and reproducible.",
      "items": [
        {
          "title": "Relevance",
          "body": "How tightly results track the user's semantic intent, retrieved over pgvector. Raise it when precision matters more than breadth.",
          "accent": "indigo"
        },
        {
          "title": "Diversity",
          "body": "How much the ranker spreads results across the catalog instead of clustering near-duplicates. Raise it to widen discovery.",
          "accent": "cyan"
        },
        {
          "title": "Novelty",
          "body": "How much fresh or less-seen inventory is surfaced over safe, familiar picks. Raise it to fight staleness and the long-tail blind spot.",
          "accent": "emerald"
        },
        {
          "title": "Popularity",
          "body": "How much aggregate demand pulls items up the ranking. Raise it to lean into proven winners; lower it to stop popularity from drowning everything else.",
          "accent": "amber"
        }
      ]
    },
    {
      "type": "prose",
      "heading": "Every slider state compiles to a versioned PolicySpec",
      "paragraphs": [
        "Dragging a slider does not nudge a hidden parameter. It compiles to a PolicySpec: a normalized reward function captured as a concrete artifact, with an author, constraints, and a timestamp. The PolicySpec is the single source of truth the ranking core reads from — there is no second, undocumented path.",
        "Because every alignment change is a versioned object, you get an audit trail for free. You can see who changed the reward function, when, and to what — and because the re-rank is deterministic, the same PolicySpec against the same candidates always produces the same order. No drift between what you intended and what shipped.",
        "This is what we mean by solving logic drift. The reward function never silently diverges from your stated intent, because intent is the artifact that drives the ranking."
      ]
    },
    {
      "type": "steps",
      "heading": "How a slider change flows through",
      "intro": "From a drag in the UI to a ranked result with a matching trace — the align -> rank -> trace pipeline.",
      "items": [
        {
          "title": "You drag a slider",
          "body": "Adjust relevance, diversity, novelty, or popularity in the dashboard. The UI normalizes the weights and compiles them into a versioned PolicySpec with author, constraints, and timestamp."
        },
        {
          "title": "The Architect translates policy into a search plan",
          "body": "The PolicySpec is turned into a pgvector semantic retrieval over your catalog (embeddings from gemini-embedding-001 at 768 dimensions) plus a deterministic weighted score applied across every candidate."
        },
        {
          "title": "The deterministic core re-ranks",
          "body": "Each candidate gets a per-item scoreBreakdown — weight, raw value, weighted value, and contribution per factor — producing a reproducible order. No stochastic tie-breaks, no hidden objective."
        },
        {
          "title": "The Reasoner assembles a faithful trace",
          "body": "For every ranked item, the Reasoner builds an explanation from the actual inputs and scores: matchedSignals, reasoning, confidenceScore, and the policy that produced them — all retrievable by traceId."
        },
        {
          "title": "Your app reads the result",
          "body": "getPersonalizedFeed(userId, { sliders }) returns the re-aligned feed; getReasoningChain(userId, itemId) returns the trace. The ranking and its explanation moved together, in real time."
        }
      ]
    },
    {
      "type": "code",
      "heading": "Re-align from the SDK",
      "intro": "Pass slider weights at request time, then pull the trace that explains the order they produced. Both calls are API-key authed through the typed tRPC SDK.",
      "file": "align.ts",
      "code": "// Request a feed under an explicit reward function\nconst feed = await glassbox.getPersonalizedFeed(userId, {\n  sliders: {\n    relevance: 0.5,\n    diversity: 0.3,\n    novelty: 0.15,\n    popularity: 0.05,\n  },\n});\n\n// Every item carries the policy + a queryable trace\nconst { traceId, scoreBreakdown, matchedSignals, confidenceScore } =\n  feed.items[0];\n\n// Pull the full reasoning chain later, by id\nconst chain = await glassbox.getReasoningChain(userId, feed.items[0].itemId);"
    },
    {
      "type": "comparison",
      "heading": "Reward sliders vs. a hard-coded objective",
      "intro": "What changes when the reward function becomes a versioned control surface instead of a library default.",
      "columns": [
        "",
        "Black-box recommender",
        "GlassBox Intent Sliders"
      ],
      "rows": [
        {
          "label": "Objective",
          "cells": [
            "One fixed metric, usually click-through",
            "Four named weights: relevance, diversity, novelty, popularity"
          ]
        },
        {
          "label": "Re-alignment",
          "cells": [
            "Offline retrain and redeploy",
            "Drag a slider; re-rank applies in real time"
          ]
        },
        {
          "label": "Auditability",
          "cells": [
            "Opaque; intent lives in code and config",
            "Versioned PolicySpec with author, constraints, timestamp"
          ]
        },
        {
          "label": "Reproducibility",
          "cells": [
            "Stochastic, hard to replay",
            "Deterministic re-rank; same PolicySpec, same order"
          ]
        },
        {
          "label": "Explanation",
          "cells": [
            "After-the-fact or absent",
            "Per-item scoreBreakdown + trace, queryable by traceId"
          ]
        }
      ]
    },
    {
      "type": "callout",
      "title": "Alignment you can defend in a review",
      "body": "Because the reward function is a versioned PolicySpec and the re-rank is deterministic, every ranking decision is reconstructable. You can answer 'why is this item here?' with the exact factors, weights, and contributions — not a prompt-spun story."
    },
    {
      "type": "faq",
      "heading": "Frequently asked",
      "items": [
        {
          "q": "Do slider changes require a model retrain?",
          "a": "No. The sliders re-weight a deterministic re-rank over your existing candidates and embeddings, so alignment changes take effect in real time. There is no offline training step between dragging a slider and serving the re-aligned feed."
        },
        {
          "q": "What exactly is a PolicySpec?",
          "a": "A PolicySpec is the versioned artifact your slider state compiles to — a normalized reward function with an author, constraints, and a timestamp. It is the single source of truth the ranking core reads, which is what makes every alignment change auditable and every re-rank reproducible."
        },
        {
          "q": "Is the re-rank actually deterministic?",
          "a": "Yes. Given the same PolicySpec and the same candidate set, the weighted score across every candidate produces the same order every time. Each item exposes a scoreBreakdown — weight, raw, weighted, and contribution per factor — so you can verify the math rather than trust it."
        },
        {
          "q": "How do the sliders relate to the reasoning trace?",
          "a": "They share one pipeline: align -> rank -> trace. The PolicySpec drives the pgvector search and weighted score, and the Reasoner assembles each explanation from those same inputs and scores. Move a slider and both the ranking and its trace move together, retrievable later by traceId."
        }
      ]
    },
    {
      "type": "cta",
      "heading": "Align ranking to what your business actually wants",
      "body": "Drag the reward function, ship a deterministic re-rank, and get a faithful trace with every result. Start free or watch the sliders move the ranking in the live demo.",
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
      "label": "Intent Alignment",
      "href": "/features/intent-alignment"
    }
  ],
  "description": "Tune your recommendation reward function with live sliders for relevance, diversity, novelty, and popularity. Business-aligned ranking, versioned and deterministic, with GlassBox.",
  "hero": {
    "eyebrow": "Logic Drift — Intent Sliders",
    "titleLead": "Tune the recommendation reward function",
    "titleAccent": "to your business intent, in real time",
    "sub": "Drag relevance, diversity, novelty, and popularity and watch the ranking re-align live. Each slider state compiles to a versioned PolicySpec that drives a deterministic re-rank — business-aligned ranking you can audit, replay, and explain.",
    "primaryCtaLabel": "Start building",
    "primaryCtaHref": "/sign-up",
    "secondaryCtaLabel": "Explore the live demo",
    "secondaryCtaHref": "/dashboard"
  },
  "keywords": [
    "recommendation reward function",
    "business-aligned ranking",
    "reward function sliders",
    "real-time ranking re-alignment",
    "deterministic re-rank",
    "versioned ranking policy",
    "relevance diversity novelty popularity weighting",
    "explainable recommendation engine"
  ],
  "slug": "/features/intent-alignment",
  "title": "Recommendation Reward Function Sliders | GlassBox Engine"
};
