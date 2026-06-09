# GlassBox Engine — Feature Status & Verification

Every feature below was brought up locally (docker infra + Next.js + workers + Python ADK
service) and verified in **Chrome** (Playwright/Chromium). Screenshots per feature live under
[`docs/images/<feature>/`](images). Filenames are prefixed by run: `01-baseline-*` (pre-work),
`02-phase2-*` (post-fix page loads), `03-interactive-*` (interactive states), `04-final-*` (final).

## Four value pillars

| Pillar | Feature | Status | Verified | Screenshots |
|---|---|---|---|---|
| **Logic Drift** | Intent Sliders → ranked feed (Alignment Studio) | ✅ demo-tight | sliders re-rank a 10-item feed with matched signals + weight distribution | [logic-drift-sliders/](images/logic-drift-sliders) |
| **Explainability** | Glass Box audit traces **+ per-item drill-down** (NEW) | ✅ demo-tight | feed card expands to show score-breakdown bars (relevance/diversity/novelty/popularity), detailed reasoning, matched signals | [explainability-reasoning-traces/](images/explainability-reasoning-traces) |
| **Cold Start** | Persona Lab + **persona-personalized feed** (NEW) | ✅ demo-tight | selecting a persona biases ranking via its preference vector; "Personalized for: …" badge | [cold-start-personas/](images/cold-start-personas) |
| **Education** | Socratic Mentor **review rendered after Commit** (NEW) | ✅ demo-tight | commit runs the Mentor (LLM); verdict + issues-by-category + Socratic dialogue render; blocked commits explain why | [education-mentor/](images/education-mentor) |

## Supporting features

| Feature | Status | Screenshots |
|---|---|---|
| Catalog Studio (CSV/JSON/URL import, embeddings) | ✅ | [catalog-studio/](images/catalog-studio) |
| Analytics (KPIs, timeline, funnel, top products) | ✅ | [analytics/](images/analytics) |
| Feedback events | ✅ | [feedback/](images/feedback) |
| Funnels — **analyze view completed** (NEW, incl. empty-state) | ✅ | [funnels/](images/funnels) |
| Website tracking | ✅ | [website-tracking/](images/website-tracking) |
| Deploy / API keys | ✅ | [deploy/](images/deploy) |
| Overview dashboard | ✅ | [overview/](images/overview) |

## Hybrid architecture (Python ADK)

- Python ADK service: `services/glassbox-agents` — Coordinator → Reasoner / Mentor / Persona
  sub-agents, structured Pydantic output, deploys to Vertex AI Agent Engine. See
  [services/glassbox-agents/DESIGN_SPEC.md](../services/glassbox-agents/DESIGN_SPEC.md).
- TS can delegate to it behind `GLASSBOX_AGENT_SERVICE_URL` with in-process fallback
  (`packages/agents/src/agent-service-client.ts`). Verified locally: the TS Mentor returned a
  real LLM review through the Python Coordinator→Mentor agent.
- **Production note:** the deployed `glassbox-web` Cloud Run service does **not** set
  `GLASSBOX_AGENT_SERVICE_URL` / `GLASSBOX_USE_ADK`, so prod runs the in-process `@google/genai`
  path, not the Agent Engine. Wiring the hybrid path in prod is an open item (set the env vars +
  add a Vertex `stream_query` transport to the client).

## Cloud deploy status (GCP project `glassbox-engine`)

**LIVE & verified:** the web app is deployed to **Cloud Run** at
`https://glassbox-web-yjjlogjuhq-uc.a.run.app`, backed by **Cloud SQL** (Postgres 16 +
pgvector, 18 tables, HNSW index) and **Memorystore** (Redis), all provisioned by Terraform.
`/api/health` → `postgres/redis/clickhouse: ok`. The deployed app was Chrome-verified
end-to-end (sign-up → demo seed → ranked feed); screenshots: `*05-live-deploy-*` and
`*06-public-*` under `docs/images/`.

**PUBLIC access enabled** — open `https://glassbox-web-yjjlogjuhq-uc.a.run.app` directly (no
auth). The org policy `iam.allowedPolicyMemberDomains` was overridden **at the project scope
only** (`allowAll: true`, leaving the org-wide restriction intact for all other projects) and
`allUsers` was granted `roles/run.invoker` on `glassbox-web`. The app's own better-auth still
gates the dashboard; the public `/api/glassbox.*` endpoints remain API-key gated.

**Agent Engine (Vertex AI) — deployed & smoke-tested, NOT wired into the prod web path:** the
Python ADK agents are deployed to **Vertex AI Agent Engine** (us-east1), reasoning engine
`projects/573736938351/locations/us-east1/reasoningEngines/617732020763623424`. Smoke-tested
on Vertex: Coordinator routes `mentor` → Socratic review JSON and `reason` → Glass Box labels JSON.
**The deployed web app does not call this engine** (see the production note above) — it uses the
in-process Gemini fallback. The engine is reachable directly via the `vertexai` SDK but is not
yet on the `glassbox-web` request path.
Deploy notes (fixed during deploy): the agent must run in **Vertex mode** (`GOOGLE_GENAI_USE_VERTEXAI=true`,
no bundled `GOOGLE_API_KEY`) so the runtime SA's OAuth serves the managed SessionService
(API keys are rejected with 401), and the model is **`gemini-2.5-flash`** (the AI-Studio alias
`gemini-flash-latest` 404s on Vertex us-east1). Query via the `vertexai` SDK:
`agent_engines.get(RID).create_session(user_id=...)` then `.stream_query(message=<json task>, user_id, session_id)`.

**Remaining (clear blocker):**
- **Workers** Cloud Run service: deferred — BullMQ workers don't serve HTTP (Cloud Run
  *services* need a port listener) and the startup ClickHouse migration is fatal. Needs a tiny
  HTTP health listener + a real external `CLICKHOUSE_URL` (ClickHouse Cloud). The web app and
  all four pillars work without it (only ClickHouse-backed analytics/tracking dashboards idle).

**Deploy bugs fixed:** Cloud SQL `edition` (ENTERPRISE vs ENTERPRISE_PLUS tier), reserved
`PORT` env on Cloud Run, and the DB client made Cloud-SQL-**socket**-aware
(`packages/database/src/client.ts`) since the socket URL isn't a valid `new URL()`.

## Production bugs fixed during this pass
1. **ClickHouse migration** could not bootstrap (client pinned to a non-existent DB) — would
   also have broken the Cloud Run workers startup. (`packages/event-pipeline/src/clickhouse/migrate.ts`)
2. **Workers crashed on startup** — `dotenv` imported but not a dependency. (`packages/event-pipeline/package.json`)
3. **BullMQ rejected queue names** containing `:` — centralized to shared `QUEUE_NAMES` with `-`.
   (`packages/event-pipeline/src/queue/names.ts`)
4. **Embedding model 404** — `text-embedding-004` was retired; switched to `gemini-embedding-001`
   @ 768 dims, restoring real semantic search for live catalogs. (`packages/agents/src/config.ts`)

## Quality gates (local)
- `pnpm typecheck` — 9/9 packages ✅
- `pnpm test` — 91 tests ✅ ; `pnpm -F @glassbox/agents test` — 47 ✅
- `pnpm -F web lint` — 0 errors, 0 warnings ✅
- `cd infra/terraform && terraform validate` — valid ✅
- `services/glassbox-agents`: `agents-cli install` + `lint` ✅, 3 tasks smoke-tested ✅
- Production **web Docker image builds and runs healthy** (postgres/redis/clickhouse all `ok`) ✅
  — fixed 4 Dockerfile deploy-blockers (see [deployment-runbook.md](deployment-runbook.md)).
  Workers image uses the same workspace pattern; rebuild after a Docker VM reset if needed.
