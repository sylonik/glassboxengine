# GlassBox Engine — Demo Video Script (≈ 2:50)

A tight, judge-facing walkthrough that hits all four pillars **and** shows the
ADK multi-agent system on the live deployment. Record at 1280×800, cursor
visible. Times are cumulative.

**Live URLs**
- Dashboard: https://glassboxengine.dev (sign in, or use the seeded demo-owner project)
- Demo store: https://demo.glassboxengine.dev
- API docs: https://glassboxengine.dev/docs

> One-time prep (off-camera): sign in, **Launch demo project** in Catalog Studio
> (seeds the 10-item catalog + embeddings), and run **Simulate** on 2–3 personas
> so the comparison and cold-start steps have data.

---

## 0:00 — Hook (15s)
> "Personalization is a black box. GlassBox Engine makes it a glass box — built
> on Google's Agent Development Kit and Gemini. Four agents, one transparent
> recommendation pipeline. Let me show you."

Open the landing page; let the four pillar cards scroll into view.

## 0:15 — Logic Drift: the Architect agent (40s)
Go to **Alignment Studio**.
1. In **Ask the Architect**, type:
   *"Push our new arrivals this month, but keep the feed relevant enough that conversion doesn't crater."*
2. Hit **Propose slider configuration**. Show the proposed sliders with **deltas**,
   the **rationale**, and the **tradeoffs** — call out the `Vertex Agent Engine` badge.
> "That's a real ADK SequentialAgent — a planner grounded by a deterministic tool
> that mirrors the production ranking math, then a schema-enforced formatter."
3. Click **Pin snapshot**, drag a slider, **Run**, and show the **before/after diff** —
   items moving up, down, in, out.
> "Logic drift, made visible."

## 0:55 — Explainability: the Glass Box trace (30s)
In the feed, expand a card → show the **score-breakdown bars** (relevance / diversity /
novelty / popularity), matched signals, and the per-item reasoning.
Open **Glass Box** in the nav → show the **audit timeline** with the Coordinator →
Architect → Reasoner steps and the trace id.
> "Every number is reproducible. The agent explains only what the math actually did."

## 1:25 — Cold Start: Persona Lab + strategy comparison (35s)
Go to **Persona Lab**.
1. Show a couple of simulated personas (interactions + confidence rings).
2. In **Strategy comparison**, adjust candidate config **B**, hit **Run comparison**,
   and show the **per-persona delta table** — predicted engagement A → B, winners and losers.
> "A/B two reward strategies across every simulated segment *before* you ship."

## 2:00 — Education: the Socratic Mentor (35s)
Go to the **Editor**. Paste a scorer with a bug (e.g. `product.viewCount / ctx.maxViews`
with no zero guard). Hit **Commit** → it's **blocked** with Socratic questions.
In **Talk it through**, type your reasoning:
*"maxViews can be 0 on an empty catalog, so this divides by zero and returns NaN."*
Show the Mentor's reply and the **"ready to commit"** nudge.
> "A multi-turn ADK dialogue. It mentors — it never writes the fix for you."

## 2:35 — Close the loop: the storefront (15s)
Open **demo.glassboxengine.dev**. Switch the shopper persona; show the
**"Recommended for you"** rail, then click **"Why this?"** on a card → the decision-trace
popover with weighted bars and the trace id.
> "Same engine, same trace — now on a real storefront, through the public API."

## 2:50 — Outro (5s)
Cut to the architecture diagram (README) or the `/docs` API reference.
> "GlassBox Engine. Aligned, testable, and explainable — end to end. Thanks for watching."

---

### Shot list / b-roll fallbacks
If a live agent call is slow on camera, these stills under `docs/images/` cover each beat:
- Logic Drift → `logic-drift-sliders/06-public-alignment-feed.png`
- Explainability → `explainability-reasoning-traces/06-public-glass-box.png`
- Cold Start → `cold-start-personas/06-public-personas.png`
- Education → `education-mentor/06-public-editor.png`

### One-line submission blurb
> GlassBox Engine is an ADK + Gemini multi-agent platform that makes ML
> personalization transparent: an Architect agent turns business goals into a
> reward-function config, a Persona Lab simulates and A/B-tests strategies, a
> Socratic Mentor agent teaches engineers via dialogue, and every recommendation
> ships a faithful Glass Box decision trace — live at glassboxengine.dev.
