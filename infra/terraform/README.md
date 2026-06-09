# GlassBox Engine — Terraform IaC (GCP)

Production-sane, modular Terraform that provisions the GCP target for GlassBox
Engine: a Next.js 16 web app + in-process tRPC API (`apps/web`), a separate
event-pipeline worker process (`packages/event-pipeline`), and their data layer
(Postgres + pgvector, Redis/BullMQ). LLM agents deploy **separately** to Vertex
AI Agent Engine — this stack only enables the API and creates a service account
for them.

## What this provisions

| Area | Resource |
|------|----------|
| APIs | run, sqladmin, redis, secretmanager, artifactregistry, cloudtrace, aiplatform, vpcaccess, compute, servicenetworking |
| Network | Custom VPC + subnet, Private Services Access peering, Serverless VPC Access connector |
| Registry | Artifact Registry Docker repo (`glassbox`) for the web + workers images |
| Database | Cloud SQL **Postgres 16**, private IP, `glassbox` DB + app user (pgvector enabled post-provision — see below) |
| Cache/Queue | Memorystore **Redis BASIC** tier (BullMQ broker) |
| Compute | Two Cloud Run v2 services: `glassbox-web` (public, :3000) and `glassbox-workers` (internal, min 1, headless) |
| Secrets | 8 Secret Manager secret containers, wired as secret env refs |
| IAM | 3 least-privilege service accounts (web, workers, Vertex AI agent) |
| Tracing | Cloud Trace API enabled; OTLP endpoint wired via env |

**Out of scope (intentional):**
- **ClickHouse** — GCP has no managed offering; treated as an external endpoint
  (see [ClickHouse (external)](#clickhouse-external)).
- **Vertex AI Agent Engine agents** — deployed separately via `agents-cli`; this
  stack only enables `aiplatform.googleapis.com` and creates the agent SA.

## Module layout

```
infra/terraform/
├── main.tf                  # root composition (wires all modules)
├── variables.tf             # project_id, region, sizing, image tags, etc.
├── outputs.tf               # service URLs, connection names, registry URL, SAs
├── providers.tf             # google + google-beta (ADC at apply time)
├── versions.tf              # provider pins + (commented) GCS backend
├── terraform.tfvars.example # copy -> terraform.tfvars
└── modules/
    ├── apis/                # google_project_service for all required APIs
    ├── network/             # VPC, subnet, PSA peering, VPC Access connector
    ├── artifact_registry/   # Docker repo for web + workers images
    ├── cloud_sql/           # Postgres 16 (private IP), DB, user, pgvector notes
    ├── redis/               # Memorystore BASIC (BullMQ)
    ├── secrets/             # Secret Manager containers (no values)
    ├── iam/                 # 3 service accounts + least-privilege bindings
    └── cloud_run_service/   # reusable Cloud Run v2 service (web + workers)
```

## Prerequisites

1. **Terraform** >= 1.5 (tested with v1.12.2).
2. **gcloud CLI** authenticated with Application Default Credentials:
   ```bash
   gcloud auth login
   gcloud auth application-default login
   gcloud config set project <PROJECT_ID>
   ```
3. A GCP project with **billing enabled** and rights to enable APIs / create
   service accounts (Owner or an equivalent custom role).
4. (Recommended) A **GCS bucket for remote state** — uncomment the `backend "gcs"`
   block in `versions.tf` and init with `-backend-config="bucket=<bucket>"`.

## Validate locally (no credentials needed)

```bash
cd infra/terraform
terraform fmt -check -recursive
terraform init -backend=false
terraform validate
```

All three pass with no GCP credentials.

## Apply order

The root module declares `depends_on` to enforce ordering, but Terraform also
naturally sequences it. A single `terraform apply` works; if you prefer to stage
it (recommended on a fresh project so API enablement settles), use targeting:

```bash
# 1. Enable APIs first (avoids race conditions on a brand-new project).
terraform apply -target=module.apis

# 2. Network + Private Services Access (Cloud SQL/Redis private IPs depend on it).
terraform apply -target=module.network

# 3. Everything else.
terraform apply
```

Then enable pgvector (see below) and push your images / set secret values.

## Build & push images

A Docker repo is created at:
`<region>-docker.pkg.dev/<project>/glassbox/<image>:<tag>`
(this is the `artifact_registry_url` output).

```bash
REGION=us-central1
PROJECT=<PROJECT_ID>
REPO=$(terraform output -raw artifact_registry_url)   # e.g. us-central1-docker.pkg.dev/<proj>/glassbox

# One-time: let docker auth to Artifact Registry.
gcloud auth configure-docker ${REGION}-docker.pkg.dev
```

### Web image (existing repo-root Dockerfile — Next.js standalone)

```bash
# Option A: local docker build + push
docker build -t ${REPO}/glassbox-web:latest -f Dockerfile .
docker push ${REPO}/glassbox-web:latest

# Option B: Cloud Build
gcloud builds submit --tag ${REPO}/glassbox-web:latest --file Dockerfile .
```

### Workers image (uses `Dockerfile.workers` at repo root)

> **NOTE / TODO:** the existing repo-root `Dockerfile` only builds the web app.
> A separate **`Dockerfile.workers`** (created at the repo root) builds the
> workers image. It is intentionally minimal — `node:22-alpine`, `pnpm install`,
> runs `pnpm --filter @glassbox/event-pipeline workers`
> (= `tsx src/scripts/start-workers.ts`). **TODO:** optimize it later with
> `turbo prune --scope=@glassbox/event-pipeline` + a compiled output to shrink
> the image and drop dev deps (`tsx` is currently kept at runtime on purpose).

```bash
docker build -t ${REPO}/glassbox-workers:latest -f Dockerfile.workers .
docker push ${REPO}/glassbox-workers:latest

# or Cloud Build:
gcloud builds submit --tag ${REPO}/glassbox-workers:latest --file Dockerfile.workers .
```

Set `web_image_tag` / `workers_image_tag` in `terraform.tfvars` to deploy a
specific tag (defaults to `latest`).

## Setting secret values

Terraform creates the **secret containers** only — values are supplied
out-of-band so plaintext never lands in state. After `apply`, add a version to
each secret:

```bash
PROJECT=<PROJECT_ID>

# Built from this stack's outputs:
DB_USER=$(terraform output -raw database_name >/dev/null; echo glassbox)
CONN=$(terraform output -raw cloudsql_connection_name)
DB_NAME=$(terraform output -raw database_name)
REDIS_URL=$(terraform output -raw redis_url)

# DATABASE_URL — Cloud Run reaches Cloud SQL via the unix socket at
# /cloudsql/<connection_name> (the service mounts it automatically):
printf 'postgresql://%s:%s@localhost/%s?host=/cloudsql/%s' \
  "glassbox" "<DB_PASSWORD>" "$DB_NAME" "$CONN" \
  | gcloud secrets versions add DATABASE_URL --project="$PROJECT" --data-file=-

printf '%s' "$REDIS_URL"          | gcloud secrets versions add REDIS_URL          --project="$PROJECT" --data-file=-
printf '%s' "<32+ char secret>"   | gcloud secrets versions add BETTER_AUTH_SECRET --project="$PROJECT" --data-file=-
printf '%s' "https://<web-url>"   | gcloud secrets versions add BETTER_AUTH_URL    --project="$PROJECT" --data-file=-
printf '%s' "https://<web-url>"   | gcloud secrets versions add NEXT_PUBLIC_APP_URL --project="$PROJECT" --data-file=-
printf '%s' "<gemini-api-key>"    | gcloud secrets versions add GOOGLE_API_KEY     --project="$PROJECT" --data-file=-
printf '%s' "https://<host>:8443" | gcloud secrets versions add CLICKHOUSE_URL     --project="$PROJECT" --data-file=-
printf '%s' "glassbox"            | gcloud secrets versions add CLICKHOUSE_DATABASE --project="$PROJECT" --data-file=-
```

> The Cloud Run services reference each secret's **`latest`** version. After
> adding/rotating a version, redeploy (or `gcloud run services update`) to pick
> it up if the revision was created before the version existed.

### Secrets the operator must supply

| Secret | Used by | Notes |
|--------|---------|-------|
| `DATABASE_URL` | web, workers | Postgres conn string (via `/cloudsql/<conn>` socket) |
| `BETTER_AUTH_SECRET` | web | >= 32 chars |
| `BETTER_AUTH_URL` | web | Public web URL |
| `GOOGLE_API_KEY` | web, workers | Gemini / Google AI key |
| `REDIS_URL` | web, workers | From `redis_url` output |
| `CLICKHOUSE_URL` | web, workers | **External** ClickHouse endpoint |
| `CLICKHOUSE_DATABASE` | web, workers | e.g. `glassbox` |
| `NEXT_PUBLIC_APP_URL` | web | Public web URL |

### Variables the operator must supply

| Variable | Required | Notes |
|----------|----------|-------|
| `project_id` | yes | GCP project |
| `db_password` | yes (apply) | `export TF_VAR_db_password=...`; never commit |
| `region` | no (default `us-central1`) | |
| `web_image_tag` / `workers_image_tag` | no (default `latest`) | |
| `otel_exporter_otlp_endpoint` | no | empty disables trace export |

See `terraform.tfvars.example` for the full list.

## pgvector enablement (REQUIRED post-provision step) — TODO

Cloud SQL for Postgres 16 ships the `vector` (pgvector) extension, but it is
**not enabled automatically** and there is **no `cloudsql.enable_pgvector`
flag** for Postgres — pgvector is purely a `CREATE EXTENSION` operation. After
the instance + `glassbox` database exist, run once:

```bash
CONN=$(terraform output -raw cloudsql_connection_name)

# Start the Cloud SQL Auth Proxy (private IP instance):
cloud-sql-proxy "$CONN" --private-ip &      # listens on 127.0.0.1:5432

PGPASSWORD='<DB_PASSWORD>' psql \
  "host=127.0.0.1 port=5432 dbname=glassbox user=glassbox" \
  -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

> A commented `null_resource "enable_pgvector"` placeholder lives in
> `modules/cloud_sql/main.tf`. It is **left commented** so `terraform validate`
> never attempts a live DB connection and no credentials are required. Enable it
> only in an environment that has connectivity to the private Cloud SQL IP, or
> just run the SQL above manually. **This is the one mandatory manual step.**

## Cloud Trace / OpenTelemetry

`cloudtrace.googleapis.com` is enabled by this stack, and both Cloud Run
services have `roles/cloudtrace.agent`. The app exports via OTLP:

- `OTEL_SERVICE_NAME` is set per service (`glassbox-engine`, `glassbox-engine-workers`).
- `OTEL_EXPORTER_OTLP_ENDPOINT` is injected from `var.otel_exporter_otlp_endpoint`
  (empty by default → export disabled).

To land traces in **Cloud Trace**, point `OTEL_EXPORTER_OTLP_ENDPOINT` at an
OTel Collector running the `googlecloud` exporter (sidecar or a centrally
deployed collector). Set it in `terraform.tfvars`, e.g.
`otel_exporter_otlp_endpoint = "http://otel-collector:4318"`.

## ClickHouse (external)

ClickHouse is the OLAP store for the event pipeline. **GCP has no managed
ClickHouse**, so it is intentionally **not provisioned** here and is treated as
an external endpoint supplied via the `CLICKHOUSE_URL` secret. Two options:

1. **ClickHouse Cloud (recommended)** — managed service. Create a service,
   create the `glassbox` database, and put the HTTPS endpoint (with creds) into
   the `CLICKHOUSE_URL` secret; set `CLICKHOUSE_DATABASE=glassbox`. Lowest ops
   burden, autoscaling, backups handled for you.
2. **Self-host on Compute Engine** — run ClickHouse on a GCE VM (ideally in the
   same VPC/region as this stack so Cloud Run reaches it privately via the VPC
   connector). You own upgrades, backups, disk sizing, and HA. Only worth it for
   strict data-residency/cost reasons. Not provisioned by this Terraform.

Run the ClickHouse migrations from the event-pipeline package once the endpoint
is reachable: `pnpm --filter @glassbox/event-pipeline migrate:clickhouse`.

## Vertex AI Agent Engine (deployed separately)

The LLM agents (`packages/agents`) deploy to **Vertex AI Agent Engine** via
`agents-cli` — **not** by this Terraform. This stack provides the plumbing:

- Enables `aiplatform.googleapis.com`.
- Creates the **agent service account** (`agent_service_account` output) with
  `roles/aiplatform.user`.

When deploying agents, use that service account as the agent runtime identity
(e.g. `--service-account $(terraform output -raw agent_service_account)`), and
supply the same `GOOGLE_API_KEY` the app uses (already in Secret Manager) so the
agents and the web/workers share one Gemini credential. The web app toggles ADK
orchestration via `GLASSBOX_USE_ADK=true` (an app env var, set on the Cloud Run
service as needed).

## Teardown

```bash
# Cloud SQL is deletion-protected by default. To destroy, first either set
# cloudsql_deletion_protection = false and re-apply, or:
#   gcloud sql instances patch <instance> --no-deletion-protection
terraform destroy
```

> The Private Services Access peering uses `deletion_policy = "ABANDON"` so a
> destroy won't hang on lingering managed-service leases; you may need to clean
> up the reserved range / peering manually afterward.
