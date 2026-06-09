# GlassBox Engine V1 Implementation Plan

## Summary
Build V1 around one proof point only: `align -> rank -> trace`. Treat GlassBox as a recommender platform, not general AutoML. Keep the recommendation core deterministic and TypeScript-owned; use ADK TypeScript only as optional orchestration around the core, not as the source of truth.

## Key Changes
- Lock the product boundary for V1:
  - Input: catalog data, user/context data, interaction events, slider weights.
  - Output: ranked recommendation list plus a faithful reasoning trace.
  - Out of scope for V1: arbitrary dataset upload, generic model hosting, Mentor-first workflows, multi-tenant simulation platform.
- Make the runtime split explicit:
  - `packages/agents` remains the home of agent-facing logic.
  - `Architect` and `Reasoner` stay as the canonical core implementations in plain TypeScript.
  - `Coordinator`, `Mentor`, and persona flows may use ADK behind `GLASSBOX_USE_ADK`, but the core recommendation path must not depend on ADK-only state, callbacks, or hidden session behavior.
  - Any ADK runner must call the same typed domain functions as the legacy path and return the same result shapes.
- Define the canonical V1 contracts before more feature work:
  - `PolicySpec`: normalized slider weights, optional ranking constraints, version, author, createdAt.
  - `RecommendationRequest`: projectId, user/context fields, queryText, candidate scope, optional policy override.
  - `RankedItem`: itemId, score, scoreBreakdown, matchedSignals.
  - `ReasoningTrace`: traceId, policyVersion, top factors, applied constraints, ordered steps, human-readable summary.
  - `RecommendationResponse`: items plus trace metadata in one response.
- Implement the V1 flow as one deterministic pipeline:
  - UI sliders produce a `PolicySpec`.
  - `Architect` translates policy plus query/context into retrieval and ranking inputs.
  - Ranking runs in TypeScript against catalog/search results.
  - `Reasoner` formats a faithful trace from actual inputs, scores, and constraints used.
  - API returns `items + traceId + summary`, and the full trace is queryable separately.
- Keep ADK TypeScript in a safe role:
  - Use it for pipeline orchestration demos, persona experiments, and future mentor/coordinator experiences.
  - Do not require ADK to own persistence, trace storage, or ranking correctness.
  - Do not duplicate business logic inside prompts if the same logic already exists in TypeScript.
- Shape the repo around the core slice:
  - `packages/api` exposes the stable V1 recommendation and trace interfaces.
  - `packages/agents` owns policy translation, ranking helpers, reasoning assembly, and optional ADK wrappers.
  - `apps/web` focuses on three working screens first: alignment, result preview, and trace inspection.

## Test Plan
- Contract tests:
  - API, SDK, and agent-layer types agree on `PolicySpec`, `RankedItem`, and `ReasoningTrace`.
  - ADK and non-ADK code paths return equivalent response shapes.
- Recommendation pipeline tests:
  - Same policy and same input produce stable rankings.
  - Score breakdown sums correctly and matches returned order.
  - Constraints affect ranking deterministically and are reflected in the trace.
- Trace faithfulness tests:
  - Every explanation element must map to actual ranking inputs or rules used.
  - No trace statement may be generated from prompt-only reasoning if it cannot be backed by score inputs or constraints.
  - Trace lookup by `traceId` reproduces the stored recommendation context.
- UI and SDK tests:
  - Slider changes alter returned policy inputs and recommendation output.
  - The web app can run alignment, view ranked items, and inspect traces without ADK enabled.
  - SDK methods return typed results and handle missing traces cleanly.
- ADK parity tests:
  - With `GLASSBOX_USE_ADK=true`, the same request returns the same ranking and materially equivalent trace content as the legacy path.
  - Failures in ADK orchestration fall back cleanly or fail visibly without corrupting stored traces.

## Assumptions
- Default implementation strategy is `TypeScript core + selective ADK`.
- The first saved artifact is an implementation plan doc, not a research memo.
- The first feature slice to prove is `align -> rank -> trace`.
- Existing repo structure is retained; work should refine the current skeleton rather than restart it.
- ADK TypeScript limitations are accepted for orchestration experiments, but not allowed to shape the truth model of ranking, trace storage, or API contracts.
