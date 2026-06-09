# GlassBox Engine — Deployment Runbook

Hybrid deployment: **TypeScript** web + API + workers + deterministic ranking on **Cloud Run**,
**Python ADK** reasoning agents on **Vertex AI Agent Engine**, **Cloud SQL** (Postgres + pgvector),
**Memorystore** (Redis), external **ClickHouse**. Infra is provisioned by Terraform under
[`infra/terraform/`](../infra/terraform).

> **Always run and verify locally before deploying.** See "Local bring-up" below and
> [production-readiness.md](production-readiness.md).

---

## 0. Local bring-up (verify everything first)

```bash
docker compose up -d                                   # postgres(5435) + redis(6379) + clickhouse(8123)
pnpm install
cp .env.example .env                                   # then fill GOOGLE_API_KEY etc.
pnpm --filter @glassbox/database db:push               # schema -> Postgres (tables + pgvector)
CLICKHOUSE_URL=http://localhost:8123 CLICKHOUSE_DATABASE=glassbox \
  pnpm --filter @glassbox/event-pipeline migrate:clickhouse
pnpm --filter web dev                                  # web on :3000
# workers (separate terminal, env from .env):
REDIS_URL=redis://localhost:6379 CLICKHOUSE_URL=http://localhost:8123 \
  DATABASE_URL=postgresql://glassbox:glassbox@localhost:5435/glassbox \
  pnpm --filter @glassbox/event-pipeline workers
```

Sign up in the UI, click **Launch demo project** to seed end-to-end demo data, then walk
the four pillars (Alignment, Glass Box, Personas, Editor). Screenshots of each feature live
under [`docs/images/`](images).

### Local Python ADK agent service (optional hybrid)
```bash
cd services/glassbox-agents && agents-cli install
uv run adk api_server --host 127.0.0.1 --port 8800 .   # serves app "app"
# point the TS side at it:
export GLASSBOX_AGENT_SERVICE_URL=http://127.0.0.1:8800
```
With the var set, the Mentor (and, following the same pattern, Reasoner/Persona) LLM steps
run in the Python ADK service; unset it to use the in-process `@google/genai` path. The TS
client (`packages/agents/src/agent-service-client.ts`) always falls back to in-process on error.

---

## 1. GCP infrastructure (Terraform)

Prereqs: a GCP project (billing enabled), `gcloud auth application-default login`, an external
ClickHouse endpoint (ClickHouse Cloud recommended — there is no managed GCP ClickHouse).

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars          # set project_id, region
export TF_VAR_db_password='<strong-password>'          # never commit
terraform init
terraform plan
terraform apply
```

Provisions: APIs, Artifact Registry, Cloud SQL (Postgres 16, private IP), Memorystore (Redis),
Serverless VPC connector, two Cloud Run v2 services (`glassbox-web`, `glassbox-workers`),
Secret Manager secrets (values supplied out-of-band), and three least-privilege service accounts
(web / workers / agent).

**Manual one-time step — pgvector** (no Cloud SQL flag for it):
```bash
# via Cloud SQL Auth Proxy to the glassbox DB:
psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS vector;"
```
Then push the schema (`db:push`) and run the ClickHouse migration against the external endpoint.

### Set secret values
```bash
for s in DATABASE_URL BETTER_AUTH_SECRET BETTER_AUTH_URL GOOGLE_API_KEY \
         REDIS_URL CLICKHOUSE_URL CLICKHOUSE_DATABASE NEXT_PUBLIC_APP_URL; do
  echo -n "$(eval echo \$$s)" | gcloud secrets versions add "$s" --data-file=-
done
```

---

## 2. Build & push images (web + workers)

```bash
REPO="<region>-docker.pkg.dev/<project>/glassbox"      # from terraform output
gcloud builds submit --tag "$REPO/web:latest" -f Dockerfile .
gcloud builds submit --tag "$REPO/workers:latest" -f Dockerfile.workers .
# then bump the image tags in terraform.tfvars and `terraform apply` to roll out.
```

---

## 3. Deploy the Python ADK agents to Agent Engine

```bash
cd services/glassbox-agents
agents-cli login --status                              # ensure authenticated
agents-cli info                                        # confirm deployment-target = agent_runtime
agents-cli deploy                                      # requires explicit approval; deploys to Agent Runtime
```
After deploy, set `GLASSBOX_AGENT_SERVICE_URL` (and auth, if using the Vertex query endpoint)
on the `glassbox-web` Cloud Run service so the API delegates LLM reasoning to the deployed agents.
The `agent` service account (Terraform, `roles/aiplatform.user`) is the identity for this path.

> **Never deploy without explicit human approval.** Confirm the target GCP project first —
> do not deploy experimental builds into a production project.

---

## 4. Post-deploy verification
- `curl https://<web-url>/api/health` → `{status:"healthy", checks:{postgres,redis,clickhouse:"ok"}}`
- Sign in, seed a demo project, exercise all four pillars.
- `agents-cli eval run` (from `services/glassbox-agents`) for agent-behavior validation.
- Cloud Trace / Cloud Logging for traces and structured logs (`OTEL_EXPORTER_OTLP_ENDPOINT`).

## CI/CD — automated main → prod (GitHub Actions + Workload Identity Federation)

Pushing to **`main`** runs `.github/workflows/ci.yml`, which gates and then deploys:

```
lint ─┐
typecheck ─┴─► test ─┐
                     ├─► build ─► deploy (prod)   ← only on push to main
recommendation-quality ─┘
integration / e2e (signal only, don't gate deploy)
```

**Security — keyless (no service-account keys; org policy blocks them):**
- GitHub's OIDC token is federated to GCP via **Workload Identity Federation**
  (`infra/terraform/modules/cicd`). The pool/provider is locked to this one repo
  (`attribute.repository == "sylonik/glassboxengine"`), and only that repo may
  impersonate the deploy SA `glassbox-cicd@glassbox-engine.iam.gserviceaccount.com`.
- The deploy SA is least-privilege: `run.admin`, `artifactregistry.writer`,
  `serviceAccountUser` on the web runtime SA, `serviceUsageConsumer`.
- App secrets stay in **Secret Manager**, wired onto the Cloud Run service. CI
  never reads or prints them — `gcloud run deploy` only swaps the image; the
  secret/VPC/Cloud SQL config is preserved (Terraform ignores image drift via
  `lifecycle.ignore_changes`).

**The deploy job** authenticates via WIF, builds + pushes
`…/glassbox-web:<sha>`, and runs `gcloud run deploy glassbox-web --image …`.

To provision the WIF + deploy SA (one-time, already applied):
```bash
cd infra/terraform && terraform apply -target=module.apis -target=module.cicd
```
The WIF provider name + SA email are Terraform outputs
(`cicd_workload_identity_provider`, `cicd_service_account_email`) and are set as
`env:` in the workflow (non-secret identifiers).

**Dev/staging (later):** add a `develop` branch + a second env (project or
prefix), parameterize the workflow `env:` per branch, and reuse the same WIF
pool with a branch-scoped binding (`attribute.ref`).

## Local Docker troubleshooting

The web and workers images install the full pnpm workspace; back-to-back builds can fill
Docker Desktop's VM disk and corrupt its buildkit/containerd metadata (symptoms:
`input/output error` on builds, containers flip to `unhealthy`, `/api/health` shows
`postgres: error`). Recovery:

1. Free host disk, then in **Docker Desktop → Troubleshoot → Clean / Purge data** (or
   quit Docker, remove the VM disk image, relaunch) to rebuild a clean VM.
2. `docker compose up -d`, then `pnpm --filter @glassbox/database db:push` +
   `migrate:clickhouse` to restore local data (re-seed the demo from the UI).
3. Rebuild images:
   ```bash
   docker build -t glassbox-web:local .                       # verified: builds + runs healthy
   docker build -f Dockerfile.workers -t glassbox-workers:local .
   ```
   The web `Dockerfile` was fixed to (a) build only the `web` turbo filter, (b) replace the
   stripped `apps/web/.env` symlink with a placeholder env file, (c) supply build-time env so
   import-time validators pass, and (d) create `apps/web/public`. The web image is verified
   (runs with all health checks green); the workers image uses the standard workspace-install
   pattern and the workers are verified to run via `tsx` locally.

## Rollback
- Cloud Run: redeploy a previous image tag (`terraform apply` with the prior tag) or
  `gcloud run services update-traffic glassbox-web --to-revisions=<prev>=100`.
- Agent Engine: `agents-cli` redeploys are versioned; re-point `GLASSBOX_AGENT_SERVICE_URL`
  or unset it to fall back to in-process reasoning.
