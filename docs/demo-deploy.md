# Demo storefront — deploy runbook

The demo storefront (`apps/demo-store`, a standalone Next.js app on port **3002**)
runs as its own Cloud Run service **`glassbox-demo`**. It talks to the Glassbox
engine over **public HTTPS only** — no database, Redis, ClickHouse, or VPC.

| Property            | Value                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Service             | `glassbox-demo`                                                       |
| Project             | `glassbox-engine`                                                     |
| Region              | `us-central1`                                                         |
| Container port      | `3002`                                                                |
| Image               | `us-central1-docker.pkg.dev/glassbox-engine/glassbox/glassbox-demo`   |
| Runtime SA          | `glassbox-demo@glassbox-engine.iam.gserviceaccount.com`              |
| Dockerfile          | `Dockerfile.demo` (repo root)                                         |
| Engine endpoint     | `https://glassbox-web-573736938351.us-central1.run.app` (GLASSBOX_ENDPOINT) |

Runtime env / secrets:

- `GLASSBOX_ENDPOINT` — plain env var, the engine base URL above.
- `GLASSBOX_API_KEY` — pulled from the Secret Manager secret `DEMO_GLASSBOX_API_KEY`.
- `NODE_ENV=production`.

The image does **not** bake `GLASSBOX_API_KEY` / `GLASSBOX_ENDPOINT`; the app reads
them at runtime. Cloud Run injects them.

> In normal operation, pushes to `main` trigger the `deploy-demo` job in
> `.github/workflows/ci.yml`, which builds `-f Dockerfile.demo`, pushes
> `glassbox-demo:<sha>` + `:latest`, and runs `gcloud run deploy glassbox-demo`.
> The steps below are for a **manual first deploy** (or a hotfix) before/without
> Terraform.

---

## 0. Prerequisites

```bash
gcloud config set project glassbox-engine
gcloud auth configure-docker us-central1-docker.pkg.dev --quiet
```

## 1. Create the `DEMO_GLASSBOX_API_KEY` secret

The secret **container** is created by Terraform (it is in the `secret_ids` list
in `infra/terraform/main.tf`). If you are deploying before applying Terraform,
create it manually, then add the value:

```bash
# Create the container (skip if Terraform already created it).
gcloud secrets create DEMO_GLASSBOX_API_KEY \
  --project glassbox-engine \
  --replication-policy automatic

# Add the API key value (reads from stdin so it never lands in shell history).
printf '%s' 'YOUR_REAL_GLASSBOX_API_KEY' | \
  gcloud secrets versions add DEMO_GLASSBOX_API_KEY \
  --project glassbox-engine \
  --data-file=-
```

Grant the demo runtime SA read access to just this secret (Terraform does this
via the `iam` module; do it manually for a pre-Terraform deploy):

```bash
gcloud secrets add-iam-policy-binding DEMO_GLASSBOX_API_KEY \
  --project glassbox-engine \
  --member "serviceAccount:glassbox-demo@glassbox-engine.iam.gserviceaccount.com" \
  --role roles/secretmanager.secretAccessor
```

## 2. Build & push the image

```bash
REGISTRY=us-central1-docker.pkg.dev/glassbox-engine/glassbox
TAG=$(git rev-parse --short=12 HEAD)
IMAGE="$REGISTRY/glassbox-demo:$TAG"

docker build -f Dockerfile.demo -t "$IMAGE" -t "$REGISTRY/glassbox-demo:latest" .
docker push "$IMAGE"
docker push "$REGISTRY/glassbox-demo:latest"
```

## 3. Deploy the service (manual first deploy)

For the **first** manual deploy, set the env var, wire the secret, and make it
public in one command. Subsequent CI deploys only swap `--image` and preserve
this config.

```bash
gcloud run deploy glassbox-demo \
  --image "$IMAGE" \
  --region us-central1 \
  --project glassbox-engine \
  --port 3002 \
  --service-account glassbox-demo@glassbox-engine.iam.gserviceaccount.com \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 4 \
  --cpu 1 \
  --memory 512Mi \
  --set-env-vars NODE_ENV=production,GLASSBOX_ENDPOINT=https://glassbox-web-573736938351.us-central1.run.app \
  --update-secrets GLASSBOX_API_KEY=DEMO_GLASSBOX_API_KEY:latest \
  --quiet
```

Print the assigned URL:

```bash
gcloud run services describe glassbox-demo \
  --region us-central1 --project glassbox-engine \
  --format="value(status.url)"
```

## 4. Map a custom domain

```bash
gcloud beta run domain-mappings create \
  --service glassbox-demo \
  --domain demo.glassboxengine.dev \
  --region us-central1 \
  --project glassbox-engine
```

This command prints the **DNS records** (a CNAME or A/AAAA set) you must add at
your DNS provider for `demo.glassboxengine.dev`. After you add them, Google
provisions a managed TLS certificate automatically (can take a few minutes up to
~24h for DNS + cert). Check status with:

```bash
gcloud beta run domain-mappings describe \
  --domain demo.glassboxengine.dev \
  --region us-central1 --project glassbox-engine
```

---

## Notes

- **Engine endpoint:** the demo points at the Glassbox engine (the `glassbox-web`
  service) at `https://glassbox-web-573736938351.us-central1.run.app`. Change it
  by updating `demo_glassbox_endpoint` in Terraform (or `--set-env-vars
  GLASSBOX_ENDPOINT=...` on a manual deploy).
- **No VPC / SQL:** the demo needs none — only outbound HTTPS. The shared
  `cloud_run_service` Terraform module skips the `vpc_access` block when
  `vpc_connector_id` is `null` (which the `cloud_run_demo` module call relies on).
- **Rotating the API key:** add a new secret version
  (`gcloud secrets versions add DEMO_GLASSBOX_API_KEY --data-file=-`) and redeploy
  (or re-run the deploy with `--update-secrets ...:latest`) so Cloud Run picks it up.
