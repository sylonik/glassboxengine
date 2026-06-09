import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "~/components/marketing/json-ld";
import {
  organizationLd,
  pageMetadata,
  softwareApplicationLd,
  websiteLd,
} from "~/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "GlassBox Engine — Explainable Recommendation Infrastructure",
  description:
    "Turn black-box ranking into a glass box. Align the reward function with live sliders, pre-warm cold starts with synthetic personas, and ship a faithful reasoning trace with every recommendation.",
  path: "/",
  keywords: [
    "explainable recommendation engine",
    "recommendation infrastructure",
    "personalization platform",
    "explainable AI",
    "reasoning traces",
    "recommendation cold start",
    "agentic ML",
  ],
});

const SDK_SNIPPET = `import { GlassBox } from "@glassbox/sdk";

const gb = new GlassBox({ apiKey: "gb_live_…" });

// 1 · a ranked feed, aligned to business intent
const feed = await gb.getPersonalizedFeed("user-123", {
  sliders: { relevance: 0.8, diversity: 0.6 },
});

// 2 · the faithful reasoning behind any result
const why = await gb.getReasoningChain("user-123", feed.items[0].itemId);

// 3 · close the loop
await gb.trackEvent({ endUserId: "user-123", eventType: "click" });`;

const PILLARS = [
  {
    no: "01",
    kicker: "Explainability",
    title: "Reasoning Traces",
    color: "var(--lp-indigo)",
    href: "/features/explainable-recommendations",
    body: "Every ranked item carries a faithful, queryable trace — the factors, the weights, the score breakdown. No prompt-spun stories. Only what the ranking math actually did.",
    icon: (
      <>
        <path d="M4 7h16M4 12h10M4 17h7" />
        <circle cx="18.5" cy="15.5" r="3.2" />
        <path d="M21 18l2 2" />
      </>
    ),
  },
  {
    no: "02",
    kicker: "Cold Start",
    title: "Persona Lab",
    color: "var(--lp-cyan)",
    href: "/features/cold-start-personas",
    body: "Pre-warm the model before you have a single real event. Generate synthetic audiences, simulate their behaviour, and derive preference vectors that rank from day zero.",
    icon: (
      <>
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
        <path d="M16 7.5a3 3 0 0 1 0 5.4M17.5 19a5.5 5.5 0 0 0-3-4.9" />
      </>
    ),
  },
  {
    no: "03",
    kicker: "Logic Drift",
    title: "Intent Sliders",
    color: "var(--lp-emerald)",
    href: "/features/intent-alignment",
    body: "Re-align the reward function in real time. Drag relevance, diversity, novelty and popularity — and watch the ranking and its trace move with you, deterministically.",
    icon: (
      <>
        <path d="M5 5v14M12 5v14M19 5v14" />
        <circle cx="5" cy="9" r="2.2" />
        <circle cx="12" cy="14" r="2.2" />
        <circle cx="19" cy="8" r="2.2" />
      </>
    ),
  },
  {
    no: "04",
    kicker: "Education",
    title: "Socratic Mentor",
    color: "var(--lp-amber)",
    href: "/features/socratic-mentor",
    body: "Commit a custom scoring function and a mentor reviews it like a senior engineer — Socratic questions on math, security and performance, before anything ships.",
    icon: (
      <>
        <path d="M12 3 2.5 8 12 13l9.5-5L12 3Z" />
        <path d="M6 10.5V15c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5" />
        <path d="M21.5 8v5" />
      </>
    ),
  },
];

const STEPS = [
  {
    no: "Align",
    body: "UI sliders compile to a versioned PolicySpec — a normalized reward function with author, constraints and a timestamp.",
  },
  {
    no: "Rank",
    body: "The Architect translates policy into a pgvector search and a deterministic weighted score across every candidate.",
  },
  {
    no: "Trace",
    body: "The Reasoner assembles a faithful explanation from the actual inputs and scores — queryable later by trace id.",
  },
];

export default function LandingPage() {
  return (
    <>
      <JsonLd data={[organizationLd(), websiteLd(), softwareApplicationLd()]} />

      {/* ── Hero ────────────────────────────────────────── */}
      <section className="lp-hero">
        <div className="lp-hero-grid" aria-hidden />
        <div className="lp-hero-glow" aria-hidden />

        <div className="lp-hero-copy">
          <p className="lp-eyebrow lp-rise" style={{ animationDelay: "40ms" }}>
            <span className="lp-dot" /> Explainable recommendation infrastructure
          </p>
          <h1 className="lp-h1">
            <span className="lp-rise" style={{ animationDelay: "120ms" }}>
              Make every
            </span>{" "}
            <span className="lp-rise" style={{ animationDelay: "200ms" }}>
              recommendation
            </span>
            <br />
            <span className="lp-rise lp-spectrum-text" style={{ animationDelay: "300ms" }}>
              explain itself.
            </span>
          </h1>
          <p className="lp-sub lp-rise" style={{ animationDelay: "440ms" }}>
            GlassBox turns black-box ranking into a glass box. Align the reward
            function with live sliders, pre-warm cold starts with synthetic
            personas, and ship a <em>faithful reasoning trace</em> with every
            result.
          </p>
          <div className="lp-cta-row lp-rise" style={{ animationDelay: "560ms" }}>
            <Link href="/sign-up" className="lp-btn lp-btn-primary lp-btn-lg">
              Start building <span className="lp-arrow">→</span>
            </Link>
            <Link href="/dashboard" className="lp-btn lp-btn-ghost lp-btn-lg">
              Explore the live demo
            </Link>
          </div>
          <ul className="lp-pipechips lp-rise" style={{ animationDelay: "680ms" }}>
            <li>align</li>
            <li className="lp-arrowchip">→</li>
            <li>rank</li>
            <li className="lp-arrowchip">→</li>
            <li>trace</li>
          </ul>
        </div>

        {/* Refraction visual: a beam enters the glass box, leaves as spectrum */}
        <div className="lp-prism lp-rise" style={{ animationDelay: "520ms" }} aria-hidden>
          <div className="lp-beam-in" />
          <div className="lp-glassbox">
            <span className="lp-glassbox-core" />
          </div>
          <div className="lp-spectrum">
            <span style={{ background: "var(--lp-indigo)" }} />
            <span style={{ background: "var(--lp-cyan)" }} />
            <span style={{ background: "var(--lp-emerald)" }} />
            <span style={{ background: "var(--lp-amber)" }} />
          </div>
          {/* a sample trace card, the product's actual artifact */}
          <div className="lp-tracecard">
            <div className="lp-tracecard-head">
              <span className="lp-tracecard-tag">reasoning.trace</span>
              <span className="lp-conf">0.91</span>
            </div>
            <p className="lp-tracecard-title">Ergonomic Standing Desk · #1</p>
            <div className="lp-bars">
              <i style={{ width: "82%", background: "var(--lp-indigo)" }} />
              <i style={{ width: "54%", background: "var(--lp-emerald)" }} />
              <i style={{ width: "33%", background: "var(--lp-amber)" }} />
            </div>
            <p className="lp-tracecard-foot">
              relevance 0.54 · diversity 0.31 · novelty 0.06
            </p>
          </div>
        </div>
      </section>

      {/* ── The shift ───────────────────────────────────── */}
      <section className="lp-shift">
        <div className="lp-shift-card lp-shift-black">
          <span className="lp-shift-label">today</span>
          <h3>The black box ranks.</h3>
          <p>
            You see <em>what</em> surfaced — never <em>why</em>. Drift is
            invisible, cold starts stall, and &ldquo;trust me&rdquo; is the only
            explanation.
          </p>
          <div className="lp-noise" aria-hidden />
        </div>
        <div className="lp-shift-arrow" aria-hidden>
          →
        </div>
        <div className="lp-shift-card lp-shift-glass">
          <span className="lp-shift-label">with glassbox</span>
          <h3>The glass box explains.</h3>
          <p>
            Every score is decomposed, every policy is versioned, every trace is
            queryable. Transparency is the default, not an afterthought.
          </p>
          <div className="lp-spectrum-edge" aria-hidden />
        </div>
      </section>

      {/* ── Pillars ─────────────────────────────────────── */}
      <section id="pillars" className="lp-section">
        <div className="lp-section-head">
          <p className="lp-eyebrow">
            <span className="lp-dot" /> Four value pillars
          </p>
          <h2 className="lp-h2">
            Built on transparency,{" "}
            <span className="lp-display-italic">not trust.</span>
          </h2>
        </div>
        <div className="lp-pillars">
          {PILLARS.map((p) => (
            <Link
              key={p.no}
              href={p.href}
              className="lp-pillar"
              style={{ ["--c" as string]: p.color }}
            >
              <div className="lp-pillar-top">
                <span className="lp-pillar-no">{p.no}</span>
                <span className="lp-pillar-icon">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {p.icon}
                  </svg>
                </span>
              </div>
              <p className="lp-pillar-kicker">{p.kicker}</p>
              <h3 className="lp-pillar-title">{p.title}</h3>
              <p className="lp-pillar-body">{p.body}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── How it works ────────────────────────────────── */}
      <section id="how" className="lp-section lp-how">
        <div className="lp-section-head">
          <p className="lp-eyebrow">
            <span className="lp-dot" /> The pipeline
          </p>
          <h2 className="lp-h2">
            One deterministic path:{" "}
            <span className="lp-display-italic">align → rank → trace.</span>
          </h2>
        </div>
        <div className="lp-steps">
          {STEPS.map((s, i) => (
            <div key={s.no} className="lp-step">
              <span className="lp-step-no">{String(i + 1).padStart(2, "0")}</span>
              <h3>{s.no}</h3>
              <p>{s.body}</p>
              {i < STEPS.length - 1 && <span className="lp-step-line" aria-hidden />}
            </div>
          ))}
        </div>
      </section>

      {/* ── Developers ──────────────────────────────────── */}
      <section id="developers" className="lp-section lp-dev">
        <div className="lp-dev-copy">
          <p className="lp-eyebrow">
            <span className="lp-dot" /> For builders
          </p>
          <h2 className="lp-h2">
            A transparent feed in{" "}
            <span className="lp-display-italic">three calls.</span>
          </h2>
          <p className="lp-sub">
            A typed SDK over a tRPC core. Rank, fetch the reasoning behind any
            result, and stream feedback back to close the loop — without ever
            losing the audit trail.
          </p>
          <ul className="lp-dev-list">
            <li>
              <b>pgvector</b> semantic retrieval with a deterministic re-rank
            </li>
            <li>
              <b>Faithful traces</b> stored and queryable by id
            </li>
            <li>
              <b>API keys, events &amp; analytics</b> built in
            </li>
          </ul>
        </div>
        <div className="lp-code">
          <div className="lp-code-head">
            <span className="lp-dots">
              <i />
              <i />
              <i />
            </span>
            <span className="lp-code-file">feed.ts</span>
          </div>
          <pre className="lp-code-body">
            <code>{SDK_SNIPPET}</code>
          </pre>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────── */}
      <section className="lp-final">
        <div className="lp-final-glow" aria-hidden />
        <h2 className="lp-final-h">
          Ship recommendations{" "}
          <span className="lp-spectrum-text">people can trust.</span>
        </h2>
        <p className="lp-sub">
          Connect a catalog, drag a slider, read the trace. Free to start.
        </p>
        <div className="lp-cta-row lp-center">
          <Link href="/sign-up" className="lp-btn lp-btn-primary lp-btn-lg">
            Get started <span className="lp-arrow">→</span>
          </Link>
          <Link href="/compare" className="lp-btn lp-btn-ghost lp-btn-lg">
            Compare GlassBox
          </Link>
        </div>
      </section>
    </>
  );
}
