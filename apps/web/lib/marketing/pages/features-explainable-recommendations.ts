import type { MarketingPage } from "~/lib/marketing/content";

export const page: MarketingPage = {
  "blocks": [
    {
      "type": "prose",
      "heading": "Recommendations that show their work",
      "paragraphs": [
        "Most recommenders hand you a ranked list and nothing else. When a stakeholder asks why an item placed where it did, the honest answer is a shrug — the model is a black box, and any explanation you bolt on afterward is a story, not a fact.",
        "GlassBox Engine inverts that. Every ranked item carries a faithful reasoning trace built from the actual inputs and scores the ranking math produced — the factors, their weights, the raw and weighted values, and the signals that matched. The explanation is not generated to sound plausible; it is assembled from what the deterministic re-rank actually did.",
        "Because the trace is derived from the score, not narrated after the fact, it stays correct when the ranking changes. Adjust the policy and the trace moves with it, deterministically."
      ]
    },
    {
      "type": "featureGrid",
      "heading": "What a reasoning trace contains",
      "intro": "Each recommendation returns a structured, queryable object — not free-form text.",
      "items": [
        {
          "title": "Per-item score breakdown",
          "body": "For every candidate, the trace records each factor — relevance, diversity, novelty, popularity — with its weight, raw value, weighted value, and contribution to the final score. You can see precisely how much each factor moved the ranking.",
          "accent": "indigo"
        },
        {
          "title": "Matched signals",
          "body": "The concrete signals that fired for this item — the semantic matches from pgvector retrieval and the catalog attributes that aligned with the request — so an explanation points to real evidence, not abstractions.",
          "accent": "cyan"
        },
        {
          "title": "Policy and confidence",
          "body": "Each result carries the versioned policy that produced it and a confidenceScore, so you know which reward function was active and how strongly the engine stands behind the placement.",
          "accent": "emerald"
        },
        {
          "title": "Queryable by trace id",
          "body": "Every recommendation emits a traceId. Pass it to getReasoningChain later to retrieve the full explanation — for an audit, a support ticket, or a debugging session — long after the request returned.",
          "accent": "amber"
        }
      ]
    },
    {
      "type": "steps",
      "heading": "How a faithful trace is produced",
      "intro": "The pipeline is align then rank then trace. The explanation is a byproduct of scoring, never a separate generation step.",
      "items": [
        {
          "title": "Align",
          "body": "UI intent sliders compile to a versioned PolicySpec — a normalized reward function with author, constraints, and timestamp. This is the contract the ranking must satisfy."
        },
        {
          "title": "Rank",
          "body": "The Architect translates the policy into a pgvector semantic search and a deterministic weighted score across every candidate, recording each factor's weight, raw value, and weighted contribution as it goes."
        },
        {
          "title": "Trace",
          "body": "The Reasoner assembles the explanation from those actual inputs and scores — never inventing factors the math did not use — and persists it under a traceId for later retrieval."
        }
      ]
    },
    {
      "type": "code",
      "heading": "Retrieve a reasoning chain by item",
      "intro": "Three typed SDK calls cover the surface. Fetch a feed, then ask why any item ranked where it did.",
      "file": "reasoning-chain.ts",
      "code": "import { glassbox } from \"@glassbox/sdk\";\n\n// 1. Rank a feed under a live policy (intent sliders).\nconst feed = await glassbox.getPersonalizedFeed(userId, {\n  sliders: { relevance: 0.6, diversity: 0.2, novelty: 0.1, popularity: 0.1 },\n});\n\nconst top = feed.items[0];\nconsole.log(top.traceId); // e.g. \"trc_9f3a...\"\n\n// 2. Ask why this item ranked where it did.\nconst chain = await glassbox.getReasoningChain(userId, top.itemId);\n\nconsole.log(chain.policy);          // versioned PolicySpec that ran\nconsole.log(chain.confidenceScore); // how strongly the engine stands behind it\nconsole.log(chain.matchedSignals);  // concrete signals that fired\n\n// scoreBreakdown is per-factor: weight, raw, weighted, contribution\nfor (const f of chain.scoreBreakdown) {\n  console.log(`${f.factor}: weight=${f.weight} raw=${f.raw} ` +\n    `weighted=${f.weighted} contribution=${f.contribution}`);\n}\n\nconsole.log(chain.reasoning); // explanation assembled from the above"
    },
    {
      "type": "prose",
      "heading": "Auditable, not anecdotal",
      "paragraphs": [
        "Because the score breakdown is deterministic, two people running the same policy against the same catalog get the same numbers — and the same trace. That makes a recommendation something you can review, reproduce, and defend.",
        "Traces are not throwaway. They are queryable later by trace id, so a placement you shipped last week can be re-examined exactly as it was scored. When a product, growth, or compliance question lands, you answer with the math instead of a guess.",
        "This is the difference between personalization that is merely effective and personalization that is also understandable, accountable, and aligned to the business intent you actually set."
      ]
    },
    {
      "type": "faq",
      "heading": "Frequently asked questions",
      "items": [
        {
          "q": "Are these explanations generated by an LLM after ranking?",
          "a": "No. The trace is assembled from the actual factors, weights, raw values, and contributions the deterministic re-rank produced. The Reasoner organizes those real inputs into an explanation; it does not invent factors the scoring math never used. There are no prompt-spun stories — only what the ranking did."
        },
        {
          "q": "What exactly is in the per-item score breakdown?",
          "a": "For each candidate, every factor — relevance, diversity, novelty, and popularity — is recorded with its weight, its raw value, its weighted value, and its contribution to the final score. Alongside it you get the matched signals, the versioned policy, a confidenceScore, and the reasoning text."
        },
        {
          "q": "Can I retrieve a trace after the request returns?",
          "a": "Yes. Every recommendation emits a traceId, and traces are queryable later by that id. Call getReasoningChain(userId, itemId) to pull the full chain for an audit, a support investigation, or debugging — well after the original response."
        },
        {
          "q": "Will the explanation still be correct if I change the ranking policy?",
          "a": "Yes. Intent sliders compile to a versioned PolicySpec, and the ranking plus its trace move with the policy deterministically. Because the explanation is derived from the score rather than narrated separately, it stays faithful to whichever policy version produced the result."
        }
      ]
    },
    {
      "type": "cta",
      "heading": "Ship recommendations that explain themselves",
      "body": "Connect a catalog, set your intent, and return a faithful reasoning trace with every result. Start building, or explore a live trace in the demo dashboard.",
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
      "label": "Explainable Recommendations",
      "href": "/features/explainable-recommendations"
    }
  ],
  "description": "Explainable recommendations from faithful reasoning traces: per-item score breakdown, matched signals, and confidence, all queryable by trace id. Personalization you can defend.",
  "hero": {
    "eyebrow": "Explainability — Reasoning Traces",
    "titleLead": "Explainable recommendations with a",
    "titleAccent": "faithful reasoning trace",
    "sub": "Every ranked item carries a queryable trace — the factors, the weights, the per-item score breakdown, and the signals that matched. No prompt-spun stories; only what the ranking math actually did.",
    "primaryCtaLabel": "Start building",
    "primaryCtaHref": "/sign-up",
    "secondaryCtaLabel": "Explore the live demo",
    "secondaryCtaHref": "/dashboard"
  },
  "keywords": [
    "explainable recommendations",
    "recommendation reasoning trace",
    "explainable recommender system",
    "faithful recommendation explanations",
    "per-item score breakdown",
    "auditable recommendation engine",
    "transparent ranking explanation",
    "GlassBox Engine explainability"
  ],
  "slug": "/features/explainable-recommendations",
  "title": "Explainable Recommendations & Reasoning Traces | GlassBox"
};
