# GlassBox Agents — DESIGN_SPEC

## Overview
The Python ADK service hosts the **LLM-reasoning agents** of GlassBox Engine for the
hybrid architecture. The deterministic recommendation ranking stays in the TypeScript
monorepo (Cloud Run); these agents run on **Vertex AI Agent Engine** (Agent Runtime)
and are invoked by the TS API via `GLASSBOX_AGENT_ENGINE` (Agent Engine, prod) or
`GLASSBOX_AGENT_SERVICE_URL` (local `adk api_server`).

A single **Coordinator** root agent routes a JSON `task` to one of four sub-agents
(mirrors the GlassBox agent names):

| task        | agent               | pillar          | purpose |
|-------------|---------------------|-----------------|---------|
| `reason`    | Reasoner            | Explainability  | Faithful Glass Box reasoning labels from a score breakdown |
| `mentor`    | Mentor              | Education       | Socratic review of scoring-function code (math/security/perf) |
| `simulate`  | Persona simulator   | Cold Start      | Synthetic interactions for a persona over a catalog |
| `architect` | Architect pipeline  | Logic Drift     | Plain-language business goal → slider proposal with rationale + tradeoffs |

The Architect is a **SequentialAgent**: a tool-using planner (grounded by the
deterministic `translate_slider_config` FunctionTool — the exact production
slider→retrieval math from `sql-builder.ts`) followed by a schema-enforced formatter.
The split exists because `output_schema` disables tools in ADK.

## Example Use Cases
- **Mentor**: TS `scoring.commit` → `{task:"mentor", code}` → `{isValid, issues[], summary, dialogue[]}`. If `isValid=false`, the commit is blocked and the dialogue is shown in the editor.
- **Reasoner**: TS Coordinator computes ranked items + `scoreBreakdown`, sends `{task:"reason", items}` → `{labels[]}` shown as per-item Glass Box explanations.
- **Persona**: `{task:"simulate", persona, catalog}` → `{interactions[], summary}`; TS persists interactions and derives the persona preference vector (embedding stays in TS).
- **Architect**: TS `alignment.proposeFromGoal` → `{task:"architect", goal, currentSliders?, catalogSummary?}` → `{profileName, sliders, derived, rationale, tradeoffs[]}`; the TS side re-derives the retrieval params with the same math so the proposal can never drift from execution.

## Tools Required
One deterministic FunctionTool: `translate_slider_config` (Architect planner only) —
the exact production slider→retrieval translation, so agent proposals are grounded in
what the engine will actually execute. Everything else is pure LLM reasoning over data
supplied in the request; the database, embeddings, and ranking all live in the TS side.
This keeps the agents stateless and safe to run on Agent Engine.

## Constraints & Safety Rules
- **Faithfulness**: the Reasoner must explain only factors actually present in the score
  breakdown — never invent factors, traits, or user behavior.
- **Mentor never writes the fix**: it asks Socratic questions, it does not output corrected code.
- **Persona realism**: only reference catalog product IDs; respect engagement caps
  (low 5 / medium 15 / high 30) and a realistic funnel (views > clicks > cart_adds > purchases).
- Structured output is enforced via Pydantic `output_schema` on each leaf agent.

## Success Criteria
- Coordinator routes each task to the correct sub-agent.
- Each task returns schema-valid JSON the TS side consumes without translation.
- Parity: outputs are materially equivalent to the legacy in-process TS agents.

## JSON Contract (TS ⇄ service)
See `app/glassbox/schemas.py`. Requests are a single user message containing a JSON object
with a `task` field plus the task payload; responses are the leaf agent's JSON (no envelope).

## Reference
- Ported from the TS sources: `packages/agents/src/{reasoner,code-validator,mentor,persona-simulator}.ts`.
- TS client: `packages/agents/src/agent-service-client.ts`.
