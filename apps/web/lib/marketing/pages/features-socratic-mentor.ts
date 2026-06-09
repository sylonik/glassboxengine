import type { MarketingPage } from "~/lib/marketing/content";

export const page: MarketingPage = {
  "blocks": [
    {
      "type": "prose",
      "heading": "A senior reviewer for your reward function",
      "paragraphs": [
        "GlassBox Engine lets you commit a custom scoring function — the math that turns raw signals into a ranked score. The Socratic Mentor is the agent that reviews that code before it ships. It reads your function the way a senior engineer would in a pull request: not just \"does it run,\" but is the math sound, is it safe to execute, and will it hold up under load.",
        "The Mentor is a Python ADK agent on Vertex AI Agent Engine, coordinated alongside the Reasoner and Persona agents. When you hit Commit, it inspects your scoring function across three axes — mathematical soundness, security and injection risk, and performance — and returns a verdict with grouped issues and a Socratic dialogue. If it finds something that would corrupt rankings or put the runtime at risk, it blocks the commit. Nothing reaches the deterministic ranking core until the review clears.",
        "This is the Education pillar: the Mentor does not silently rewrite your code or hand you a fix to paste. It asks the questions that surface the flaw, so the next function you write is better. Code review as teaching, applied to the one piece of logic that decides what every end user sees."
      ]
    },
    {
      "type": "featureGrid",
      "heading": "What the Mentor reviews",
      "intro": "Every commit is examined across three axes before it can reach the ranking core.",
      "items": [
        {
          "title": "Mathematical soundness",
          "body": "Does the score behave the way you intend? The Mentor probes normalization, weight handling, division and edge cases, and whether the function stays monotonic and bounded across the candidate set — the failure modes that quietly distort a ranking instead of crashing it.",
          "accent": "indigo"
        },
        {
          "title": "Security and injection risk",
          "body": "Custom code runs against your catalog and signals. The Mentor flags unsafe patterns, injection vectors, and anything that reaches beyond the scoring contract, so a scoring function can never become an attack surface on the runtime.",
          "accent": "amber"
        },
        {
          "title": "Performance",
          "body": "Scoring runs across every candidate on every request. The Mentor calls out costly operations, accidental loops, and complexity that would not survive a real catalog at request time — before it becomes a latency regression in production.",
          "accent": "cyan"
        },
        {
          "title": "A blocking gate, not a linter",
          "body": "When an issue is severe enough to corrupt rankings or endanger the runtime, the Mentor returns a blocked verdict and the commit does not ship. You see the grouped issues and the dialogue, fix the cause, and commit again.",
          "accent": "emerald"
        }
      ]
    },
    {
      "type": "steps",
      "heading": "How a scoring function review works",
      "items": [
        {
          "title": "Write and commit your scoring function",
          "body": "In the editor you author a custom scoring function for the active project and hit Commit. This is your reward logic — the deterministic math the ranking core applies across every candidate after pgvector retrieval."
        },
        {
          "title": "The Mentor reviews the code",
          "body": "The commit is handed to the Socratic Mentor agent. It analyzes the function across math, security, and performance, then assembles a verdict, a grouped list of issues, and a transcript of Socratic questions."
        },
        {
          "title": "Approve and ship, or block and learn",
          "body": "If the function is sound, the verdict is approved and the commit ships into the ranking pipeline. If not, the commit is blocked: you read the questions, address the underlying problem, and commit again. The gate stays closed until the review clears."
        }
      ]
    },
    {
      "type": "callout",
      "title": "A question the Mentor might ask",
      "body": "\"Your function divides each candidate's signal by the maximum value in the batch to normalize it. What score does this function return when a request arrives with a single candidate, or when every candidate shares the same value and that maximum is zero? Walk through what the ranking core receives in that case.\" The Mentor does not patch the divide-by-zero for you — it makes you see the unbounded edge case, so you reach for the guard yourself and remember it next time."
    },
    {
      "type": "prose",
      "heading": "Why review the math, not just the model",
      "paragraphs": [
        "Most recommenders hide the scoring logic inside a black box, so there is nothing to review and no way to be accountable for a bad ranking. GlassBox inverts that: the reward function is explicit, versioned, and yours to edit — which means it also needs a reviewer.",
        "Because the ranking core is deterministic and every result carries a faithful reasoning trace, a flaw in your scoring function shows up directly in the score breakdown and the trace, not buried under a prompt-spun story. The Mentor is the safeguard at the front of that pipeline: it catches the unsound, unsafe, or slow function before it ever produces a trace you would have to explain away.",
        "The result is an alignment loop you can trust end to end — sliders compile to a versioned PolicySpec, the Architect turns policy into a deterministic weighted score, the Reasoner explains the actual inputs, and the Mentor keeps the custom math behind it honest."
      ]
    },
    {
      "type": "faq",
      "heading": "Socratic Mentor FAQ",
      "items": [
        {
          "q": "What exactly is a scoring function in GlassBox?",
          "a": "It is the deterministic math that converts a candidate's signals and weights into a ranked score. After pgvector retrieval surfaces candidates, the scoring function decides how they order — so it is the single piece of logic with the most influence over what every end user sees. GlassBox lets you commit a custom one per project."
        },
        {
          "q": "Will the Mentor block my commit?",
          "a": "Yes, when it must. If the Mentor finds an issue severe enough to corrupt rankings or endanger the runtime — an unbounded edge case, an injection risk, or a performance problem that would not survive a real catalog — it returns a blocked verdict and the commit does not ship. You fix the underlying cause and commit again."
        },
        {
          "q": "Does the Mentor rewrite my code for me?",
          "a": "No. The Education pillar is deliberate: the Mentor asks Socratic questions about mathematical soundness, security, and performance rather than handing you a patch. It surfaces the flaw so you understand and fix it, which makes the next function you write better. It is a teacher and a gate, not an autocomplete."
        },
        {
          "q": "How is this different from a normal linter or static analyzer?",
          "a": "A linter checks syntax and style. The Mentor is an LLM-reasoning agent built on Google's ADK and Gemini that reasons about whether your reward math is sound, whether the code is safe to execute against your catalog, and whether it will perform at request time — and it can block the commit on the basis of that review."
        }
      ]
    },
    {
      "type": "cta",
      "title": "Commit a scoring function the Mentor will sign off on",
      "body": "Connect a catalog, write your reward math, and let the Socratic Mentor review it across soundness, security, and performance before anything ships. Explore it live, or start building today.",
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
      "label": "Socratic Mentor",
      "href": "/features/socratic-mentor"
    }
  ],
  "description": "The Socratic Mentor is GlassBox Engine's AI code mentor: commit a custom scoring function and an agent reviews its math, security, and performance, blocking unsafe code so your rankings stay sound.",
  "hero": {
    "eyebrow": "Education · Socratic Mentor",
    "titleLead": "An AI code mentor that reviews your",
    "titleAccent": "scoring function before it ships",
    "sub": "Commit a custom reward function and the Socratic Mentor reviews it like a senior engineer — Socratic questions on mathematical soundness, security, and performance — and blocks the commit when the math is not safe to ship.",
    "primaryCtaLabel": "Start building",
    "primaryCtaHref": "/sign-up",
    "secondaryCtaLabel": "Explore the live demo",
    "secondaryCtaHref": "/dashboard"
  },
  "keywords": [
    "AI code mentor",
    "scoring function review",
    "custom scoring function",
    "reward function review",
    "explainable recommendation engine",
    "Socratic code review agent",
    "AI pull request reviewer",
    "ranking function safety",
    "GlassBox Engine"
  ],
  "slug": "/features/socratic-mentor",
  "title": "AI Code Mentor for Scoring Functions · GlassBox"
};
