import Link from "next/link";
import { Instrument_Serif, JetBrains_Mono } from "next/font/google";

const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--lp-display",
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--lp-mono",
  display: "swap",
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
    <div className={`lp ${display.variable} ${mono.variable}`}>
      {/* ── Nav ─────────────────────────────────────────── */}
      <header className="lp-nav">
        <Link href="/" className="lp-brand" aria-label="GlassBox home">
          <span className="lp-mark">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="2" />
              <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" opacity="0.28" />
              <rect x="9.5" y="9.5" width="5" height="5" rx="1" fill="currentColor" />
            </svg>
          </span>
          <span className="lp-wordmark">GlassBox</span>
        </Link>
        <nav className="lp-navlinks">
          <a href="#pillars">Pillars</a>
          <a href="#how">How it works</a>
          <a href="#developers">Developers</a>
        </nav>
        <div className="lp-navcta">
          <Link href="/sign-in" className="lp-link-muted">
            Sign in
          </Link>
          <Link href="/sign-up" className="lp-btn lp-btn-primary">
            Get started
          </Link>
        </div>
      </header>

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
            <article
              key={p.no}
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
            </article>
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
          <Link href="/dashboard" className="lp-btn lp-btn-ghost lp-btn-lg">
            See the live demo
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="lp-footer">
        <div className="lp-brand">
          <span className="lp-mark">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="2" />
              <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" opacity="0.28" />
              <rect x="9.5" y="9.5" width="5" height="5" rx="1" fill="currentColor" />
            </svg>
          </span>
          <span className="lp-wordmark">GlassBox</span>
        </div>
        <p className="lp-foot-tag">Explainable recommendation infrastructure.</p>
        <p className="lp-foot-copy">© 2026 GlassBox Engine</p>
      </footer>

      <style>{LP_CSS}</style>
    </div>
  );
}

const LP_CSS = `
.lp {
  --lp-indigo: #7b78ff;
  --lp-cyan: #38d6e0;
  --lp-emerald: #34d399;
  --lp-amber: #f5b34a;
  --lp-ink: #ededed;
  --lp-dim: #a0a0a0;
  --lp-faint: #6a6a6a;
  --lp-line: #1c1c1f;
  --lp-bg: #050506;
  background: var(--lp-bg);
  color: var(--lp-ink);
  font-family: var(--font-body, "Inter", system-ui, sans-serif);
  min-height: 100vh;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
}
.lp ::selection { background: rgba(123,120,255,0.32); }
.lp a { color: inherit; text-decoration: none; }

/* ── reveal ── */
@keyframes lpRise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
.lp-rise { opacity: 0; animation: lpRise 0.7s cubic-bezier(0.16,1,0.3,1) forwards; }

/* ── nav ── */
.lp-nav {
  position: sticky; top: 0; z-index: 50;
  display: flex; align-items: center; gap: 32px;
  padding: 16px clamp(20px, 5vw, 64px);
  background: rgba(5,5,6,0.72);
  backdrop-filter: saturate(140%) blur(14px);
  border-bottom: 1px solid var(--lp-line);
}
.lp-brand { display: inline-flex; align-items: center; gap: 10px; }
.lp-mark { color: var(--lp-indigo); display: inline-flex; filter: drop-shadow(0 0 10px rgba(123,120,255,0.5)); }
.lp-wordmark { font-weight: 600; letter-spacing: -0.02em; font-size: 17px; }
.lp-navlinks { display: flex; gap: 28px; margin-left: 8px; font-size: 14px; color: var(--lp-dim); }
.lp-navlinks a { transition: color 0.2s; }
.lp-navlinks a:hover { color: var(--lp-ink); }
.lp-navcta { margin-left: auto; display: flex; align-items: center; gap: 18px; }
.lp-link-muted { font-size: 14px; color: var(--lp-dim); transition: color 0.2s; }
.lp-link-muted:hover { color: var(--lp-ink); }

/* ── buttons ── */
.lp-btn {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 14px; font-weight: 500; border-radius: 9px;
  padding: 9px 16px; border: 1px solid transparent; transition: all 0.2s ease;
  font-family: var(--font-body, sans-serif); cursor: pointer; white-space: nowrap;
}
.lp-btn-lg { padding: 13px 22px; font-size: 15px; border-radius: 11px; }
.lp-btn-primary {
  background: linear-gradient(180deg, #6a66f0, #5751d6);
  color: #fff; box-shadow: 0 1px 0 rgba(255,255,255,0.18) inset, 0 8px 28px -10px rgba(94,90,219,0.8);
}
.lp-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 1px 0 rgba(255,255,255,0.22) inset, 0 14px 34px -10px rgba(94,90,219,0.95); }
.lp-btn-ghost { background: rgba(255,255,255,0.03); color: var(--lp-ink); border-color: var(--lp-line); }
.lp-btn-ghost:hover { background: rgba(255,255,255,0.06); border-color: #34343a; }
.lp-arrow { transition: transform 0.25s; }
.lp-btn:hover .lp-arrow { transform: translateX(4px); }

/* ── eyebrow ── */
.lp-eyebrow {
  display: inline-flex; align-items: center; gap: 9px;
  font-family: var(--lp-mono), monospace; font-size: 12px; letter-spacing: 0.16em;
  text-transform: uppercase; color: var(--lp-dim);
}
.lp-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--lp-indigo); box-shadow: 0 0 12px 1px var(--lp-indigo); animation: lpPulse 2.6s ease-in-out infinite; }
@keyframes lpPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

/* ── hero ── */
.lp-hero {
  position: relative;
  display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 40px; align-items: center;
  padding: clamp(56px, 9vw, 120px) clamp(20px, 5vw, 64px) clamp(64px, 8vw, 110px);
  max-width: 1240px; margin: 0 auto;
}
.lp-hero-grid {
  position: absolute; inset: 0; z-index: 0; pointer-events: none;
  background-image: linear-gradient(var(--lp-line) 1px, transparent 1px), linear-gradient(90deg, var(--lp-line) 1px, transparent 1px);
  background-size: 56px 56px;
  -webkit-mask-image: radial-gradient(120% 90% at 30% 10%, #000 30%, transparent 78%);
  mask-image: radial-gradient(120% 90% at 30% 10%, #000 30%, transparent 78%);
  opacity: 0.5;
}
.lp-hero-glow {
  position: absolute; z-index: 0; pointer-events: none;
  top: -160px; right: -120px; width: 760px; height: 760px;
  background: radial-gradient(circle at 60% 40%, rgba(123,120,255,0.22), rgba(56,214,224,0.10) 38%, transparent 66%);
  filter: blur(20px);
}
.lp-hero-copy { position: relative; z-index: 2; }
.lp-h1 {
  font-family: var(--lp-display), Georgia, serif;
  font-weight: 400; line-height: 1.02; letter-spacing: -0.01em;
  font-size: clamp(44px, 7vw, 86px); margin: 22px 0 0;
}
.lp-h1 .lp-rise { display: inline-block; }
.lp-spectrum-text {
  background: linear-gradient(100deg, var(--lp-indigo), var(--lp-cyan) 38%, var(--lp-emerald) 68%, var(--lp-amber));
  -webkit-background-clip: text; background-clip: text; color: transparent;
  font-style: italic;
}
.lp-sub {
  margin: 26px 0 0; max-width: 30em; font-size: clamp(16px, 1.4vw, 18px);
  line-height: 1.62; color: var(--lp-dim);
}
.lp-sub em { color: var(--lp-ink); font-style: normal; font-weight: 500; }
.lp-cta-row { display: flex; gap: 14px; margin-top: 34px; flex-wrap: wrap; }
.lp-cta-row.lp-center { justify-content: center; }
.lp-pipechips { display: flex; align-items: center; gap: 12px; margin: 34px 0 0; padding: 0; list-style: none; font-family: var(--lp-mono), monospace; font-size: 12.5px; letter-spacing: 0.1em; color: var(--lp-faint); text-transform: uppercase; }
.lp-pipechips li:not(.lp-arrowchip) { padding: 6px 13px; border: 1px solid var(--lp-line); border-radius: 7px; background: rgba(255,255,255,0.02); color: var(--lp-dim); }
.lp-arrowchip { color: var(--lp-indigo); }

/* ── refraction visual ── */
.lp-prism { position: relative; z-index: 2; height: 460px; }
.lp-beam-in {
  position: absolute; top: 88px; left: 0; width: 46%; height: 2px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.85));
  box-shadow: 0 0 14px 1px rgba(255,255,255,0.5);
}
.lp-glassbox {
  position: absolute; top: 56px; left: 42%; width: 96px; height: 96px;
  border: 1px solid rgba(255,255,255,0.3); border-radius: 14px;
  background: linear-gradient(135deg, rgba(255,255,255,0.10), rgba(123,120,255,0.06));
  backdrop-filter: blur(4px);
  box-shadow: 0 0 50px -8px rgba(123,120,255,0.6), inset 0 0 28px rgba(255,255,255,0.06);
  transform: rotate(45deg); display: grid; place-items: center;
  animation: lpFloat 7s ease-in-out infinite;
}
@keyframes lpFloat { 0%,100% { transform: rotate(45deg) translateY(0); } 50% { transform: rotate(45deg) translateY(-10px); } }
.lp-glassbox-core { width: 34px; height: 34px; border-radius: 6px; background: rgba(255,255,255,0.9); box-shadow: 0 0 26px 4px rgba(255,255,255,0.7); }
.lp-spectrum { position: absolute; top: 74px; left: calc(42% + 96px); display: flex; flex-direction: column; gap: 7px; width: 44%; }
.lp-spectrum span { height: 12px; border-radius: 0 7px 7px 0; filter: blur(0.3px); transform-origin: left; animation: lpSpread 1s cubic-bezier(0.16,1,0.3,1) backwards; box-shadow: 0 0 18px -2px currentColor; }
.lp-spectrum span:nth-child(1){ animation-delay: .7s; width: 92%; }
.lp-spectrum span:nth-child(2){ animation-delay: .8s; width: 100%; }
.lp-spectrum span:nth-child(3){ animation-delay: .9s; width: 86%; }
.lp-spectrum span:nth-child(4){ animation-delay: 1s; width: 70%; }
@keyframes lpSpread { from { transform: scaleX(0); opacity: 0; } to { transform: scaleX(1); opacity: 0.95; } }
.lp-tracecard {
  position: absolute; bottom: 6px; right: 0; width: 290px;
  padding: 16px; border-radius: 14px; border: 1px solid var(--lp-line);
  background: linear-gradient(180deg, rgba(20,20,24,0.92), rgba(12,12,15,0.92));
  backdrop-filter: blur(10px); box-shadow: 0 24px 60px -20px rgba(0,0,0,0.9);
  animation: lpFloat 9s ease-in-out infinite reverse;
}
.lp-tracecard-head { display: flex; justify-content: space-between; align-items: center; }
.lp-tracecard-tag { font-family: var(--lp-mono), monospace; font-size: 11px; color: var(--lp-indigo); letter-spacing: 0.06em; }
.lp-conf { font-family: var(--lp-mono), monospace; font-size: 12px; color: var(--lp-emerald); font-weight: 700; }
.lp-tracecard-title { margin: 12px 0 12px; font-size: 14px; font-weight: 600; }
.lp-bars { display: flex; flex-direction: column; gap: 6px; }
.lp-bars i { height: 6px; border-radius: 4px; display: block; }
.lp-tracecard-foot { margin: 12px 0 0; font-family: var(--lp-mono), monospace; font-size: 10.5px; color: var(--lp-faint); }

/* ── shift ── */
.lp-shift {
  display: grid; grid-template-columns: 1fr auto 1fr; gap: 22px; align-items: stretch;
  max-width: 1080px; margin: 0 auto; padding: 20px clamp(20px,5vw,64px) 40px;
}
.lp-shift-card { position: relative; overflow: hidden; padding: 30px; border-radius: 18px; border: 1px solid var(--lp-line); }
.lp-shift-label { font-family: var(--lp-mono), monospace; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--lp-faint); }
.lp-shift-card h3 { font-family: var(--lp-display), serif; font-weight: 400; font-size: 30px; margin: 14px 0 10px; }
.lp-shift-card p { color: var(--lp-dim); line-height: 1.6; font-size: 15px; }
.lp-shift-card em { color: var(--lp-ink); font-style: italic; }
.lp-shift-black { background: #08080a; }
.lp-noise { position: absolute; inset: 0; opacity: 0.5; background-image: radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px); background-size: 7px 7px; -webkit-mask-image: linear-gradient(180deg, transparent, #000); mask-image: linear-gradient(180deg, transparent, #000); }
.lp-shift-glass { background: linear-gradient(180deg, rgba(123,120,255,0.06), rgba(56,214,224,0.03)); border-color: rgba(123,120,255,0.22); }
.lp-spectrum-edge { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: linear-gradient(180deg, var(--lp-indigo), var(--lp-cyan), var(--lp-emerald), var(--lp-amber)); }
.lp-shift-arrow { align-self: center; color: var(--lp-faint); font-size: 22px; }

/* ── sections ── */
.lp-section { max-width: 1180px; margin: 0 auto; padding: clamp(60px,8vw,110px) clamp(20px,5vw,64px); }
.lp-section-head { margin-bottom: 50px; max-width: 30em; }
.lp-h2 { font-family: var(--lp-display), serif; font-weight: 400; font-size: clamp(32px,4.5vw,52px); line-height: 1.06; letter-spacing: -0.01em; margin: 18px 0 0; }
.lp-display-italic { font-style: italic; color: var(--lp-dim); }

/* ── pillars ── */
.lp-pillars { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; }
.lp-pillar {
  position: relative; padding: 30px; border-radius: 18px;
  border: 1px solid var(--lp-line); background: linear-gradient(180deg, rgba(255,255,255,0.022), rgba(255,255,255,0));
  transition: transform 0.3s cubic-bezier(0.16,1,0.3,1), border-color 0.3s, background 0.3s;
  overflow: hidden;
}
.lp-pillar::before { content: ""; position: absolute; left: 0; top: 0; height: 100%; width: 3px; background: var(--c); opacity: 0.7; box-shadow: 0 0 22px 0 var(--c); }
.lp-pillar:hover { transform: translateY(-4px); border-color: color-mix(in srgb, var(--c) 40%, var(--lp-line)); background: linear-gradient(180deg, color-mix(in srgb, var(--c) 7%, transparent), transparent); }
.lp-pillar-top { display: flex; justify-content: space-between; align-items: center; }
.lp-pillar-no { font-family: var(--lp-mono), monospace; font-size: 13px; color: var(--lp-faint); letter-spacing: 0.1em; }
.lp-pillar-icon { color: var(--c); display: inline-flex; }
.lp-pillar-kicker { margin: 22px 0 4px; font-family: var(--lp-mono), monospace; font-size: 11.5px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--c); }
.lp-pillar-title { font-size: 21px; font-weight: 600; letter-spacing: -0.01em; margin: 0; }
.lp-pillar-body { margin: 12px 0 0; color: var(--lp-dim); line-height: 1.6; font-size: 14.5px; }

/* ── steps ── */
.lp-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; }
.lp-step { position: relative; }
.lp-step-no { font-family: var(--lp-mono), monospace; font-size: 13px; color: var(--lp-indigo); }
.lp-step h3 { font-family: var(--lp-display), serif; font-weight: 400; font-size: 26px; margin: 12px 0 10px; }
.lp-step p { color: var(--lp-dim); line-height: 1.6; font-size: 15px; max-width: 26em; }
.lp-step-line { position: absolute; top: 8px; right: -20px; width: 40px; height: 1px; background: linear-gradient(90deg, var(--lp-line), transparent); }

/* ── developers ── */
.lp-dev { display: grid; grid-template-columns: 0.85fr 1.15fr; gap: 56px; align-items: center; }
.lp-dev-copy .lp-sub { margin-top: 22px; }
.lp-dev-list { list-style: none; padding: 0; margin: 26px 0 0; display: grid; gap: 12px; }
.lp-dev-list li { position: relative; padding-left: 26px; color: var(--lp-dim); font-size: 14.5px; line-height: 1.5; }
.lp-dev-list li b { color: var(--lp-ink); font-weight: 600; }
.lp-dev-list li::before { content: ""; position: absolute; left: 0; top: 7px; width: 9px; height: 9px; border-radius: 2px; background: var(--lp-emerald); box-shadow: 0 0 10px var(--lp-emerald); }
.lp-code { border-radius: 16px; border: 1px solid var(--lp-line); background: #0a0a0c; overflow: hidden; box-shadow: 0 40px 90px -40px rgba(0,0,0,0.9); }
.lp-code-head { display: flex; align-items: center; gap: 12px; padding: 13px 16px; border-bottom: 1px solid var(--lp-line); background: #0d0d10; }
.lp-dots { display: inline-flex; gap: 7px; }
.lp-dots i { width: 11px; height: 11px; border-radius: 50%; background: #26262b; display: block; }
.lp-dots i:nth-child(1){ background:#5a4a4a; } .lp-dots i:nth-child(2){ background:#5a564a; } .lp-dots i:nth-child(3){ background:#4a5a4d; }
.lp-code-file { font-family: var(--lp-mono), monospace; font-size: 12px; color: var(--lp-faint); }
.lp-code-body { margin: 0; padding: 22px; overflow-x: auto; font-family: var(--lp-mono), monospace; font-size: 13px; line-height: 1.75; color: #c9c9d4; }
.lp-code-body code { font-family: inherit; }

/* ── final ── */
.lp-final { position: relative; text-align: center; padding: clamp(80px,10vw,140px) clamp(20px,5vw,64px); border-top: 1px solid var(--lp-line); overflow: hidden; }
.lp-final-glow { position: absolute; inset: 0; background: radial-gradient(60% 120% at 50% 0%, rgba(123,120,255,0.16), transparent 60%); pointer-events: none; }
.lp-final-h { position: relative; font-family: var(--lp-display), serif; font-weight: 400; font-size: clamp(36px,6vw,68px); line-height: 1.05; margin: 0 auto; max-width: 14em; }
.lp-final .lp-sub { margin: 22px auto 0; }

/* ── footer ── */
.lp-footer { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; padding: 30px clamp(20px,5vw,64px); border-top: 1px solid var(--lp-line); color: var(--lp-faint); font-size: 13px; }
.lp-foot-tag { margin-left: 8px; color: var(--lp-dim); }
.lp-foot-copy { margin-left: auto; }

/* ── responsive ── */
@media (max-width: 900px) {
  .lp-hero { grid-template-columns: 1fr; }
  .lp-prism { display: none; }
  .lp-pillars { grid-template-columns: 1fr; }
  .lp-steps { grid-template-columns: 1fr; gap: 28px; }
  .lp-step-line { display: none; }
  .lp-dev { grid-template-columns: 1fr; gap: 32px; }
  .lp-shift { grid-template-columns: 1fr; }
  .lp-shift-arrow { transform: rotate(90deg); }
  .lp-navlinks { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .lp-rise, .lp-glassbox, .lp-tracecard, .lp-spectrum span, .lp-dot { animation: none !important; opacity: 1 !important; transform: none !important; }
}
`;
