#!/usr/bin/env bash
###############################################################################
# One-shot, idempotent prod finalization for the Glassbox demo storefront.
#
# Provisions a self-hosted ClickHouse on a GCE VM, points the engine at it,
# redeploys workers + web (so the event pipeline actually persists), deploys the
# demo Cloud Run service, and creates the demo.glassboxengine.dev domain mapping
# (printing the DNS records you must add at your registrar — it does NOT go live
# until DNS points at it).
#
# Prereqs:
#   gcloud auth login && gcloud config set project glassbox-engine
#   export GLASSBOX_API_KEY=gb_live_...   # the demo "Demo Store" ingestion key
#
# Safe to re-run; each step is idempotent.
###############################################################################
set -euo pipefail

PROJECT=glassbox-engine
REGION=us-central1
ZONE="${ZONE:-us-central1-a}"
NETWORK=glassbox-vpc
SUBNET=glassbox-subnet
REGISTRY="us-central1-docker.pkg.dev/${PROJECT}/glassbox"
ENGINE_URL="${ENGINE_URL:-https://glassboxengine.dev}"
VM=glassbox-clickhouse
SUBNET_CIDR=10.10.0.0/20
CONNECTOR_CIDR=10.8.0.0/28
TAG="$(git rev-parse --short=12 HEAD)"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

: "${GLASSBOX_API_KEY:?Set GLASSBOX_API_KEY to the demo gb_live_ ingestion key}"

echo "==> 1/8  Cloud NAT + ClickHouse VM (${VM})"
# The VM has no external IP. It needs Cloud NAT for egress to Docker Hub to pull
# the ClickHouse image (Private Google Access alone doesn't cover docker.io).
# NAT must exist before the VM's first boot so its startup-script can pull.
gcloud compute routers create glassbox-nat-router \
  --network "$NETWORK" --region "$REGION" --project "$PROJECT" 2>/dev/null || echo "    router exists"
gcloud compute routers nats create glassbox-nat \
  --router glassbox-nat-router --region "$REGION" --project "$PROJECT" \
  --auto-allocate-nat-external-ips --nat-all-subnet-ip-ranges 2>/dev/null || echo "    nat exists"
if ! gcloud compute instances describe "$VM" --zone "$ZONE" --project "$PROJECT" >/dev/null 2>&1; then
  gcloud compute instances create "$VM" \
    --project "$PROJECT" --zone "$ZONE" \
    --machine-type e2-small \
    --image-family cos-stable --image-project cos-cloud \
    --boot-disk-size 30GB \
    --network "$NETWORK" --subnet "$SUBNET" --no-address \
    --tags clickhouse \
    --metadata-from-file "startup-script=${SCRIPT_DIR}/clickhouse-startup.sh"
else
  echo "    exists — skipping"
fi

echo "==> 2/8  Firewall (VPC-internal -> tcp:8123,9000)"
gcloud compute firewall-rules create allow-clickhouse-internal \
  --project "$PROJECT" --network "$NETWORK" \
  --direction INGRESS --action ALLOW --rules tcp:8123,tcp:9000 \
  --source-ranges "${SUBNET_CIDR},${CONNECTOR_CIDR}" --target-tags clickhouse \
  2>/dev/null || echo "    rule exists — skipping"

echo "==> 3/8  Resolve VM private IP"
CH_IP="$(gcloud compute instances describe "$VM" --zone "$ZONE" --project "$PROJECT" \
  --format='value(networkInterfaces[0].networkIP)')"
echo "    ClickHouse private IP: ${CH_IP}"

echo "==> 4/8  Set CLICKHOUSE_URL secret -> http://${CH_IP}:8123"
printf 'http://%s:8123' "$CH_IP" | \
  gcloud secrets versions add CLICKHOUSE_URL --project "$PROJECT" --data-file=-

echo "==> 5/8  Build + deploy workers (datetime fix + migration retry)"
gcloud builds submit --config cloudbuild.workers.yaml \
  --substitutions "_IMAGE=${REGISTRY}/glassbox-workers:${TAG}" --project "$PROJECT" .
gcloud run deploy glassbox-workers \
  --image "${REGISTRY}/glassbox-workers:${TAG}" \
  --region "$REGION" --project "$PROJECT" --quiet
echo "    workers redeployed — they run ClickHouse migrations on startup (with retry)"

echo "==> 6/8  Redeploy web :latest (pick up new CLICKHOUSE_URL + middleware/datetime fixes)"
gcloud run deploy glassbox-web \
  --image "${REGISTRY}/glassbox-web:latest" \
  --region "$REGION" --project "$PROJECT" --quiet

echo "==> 7/8  Build + deploy demo storefront"
gcloud builds submit --config cloudbuild.demo.yaml \
  --substitutions "_IMAGE=${REGISTRY}/glassbox-demo:${TAG}" --project "$PROJECT" .
gcloud run deploy glassbox-demo \
  --image "${REGISTRY}/glassbox-demo:${TAG}" \
  --region "$REGION" --project "$PROJECT" \
  --port 3002 --allow-unauthenticated \
  --min-instances 0 --max-instances 4 --cpu 1 --memory 512Mi \
  --set-env-vars "NODE_ENV=production,GLASSBOX_ENDPOINT=${ENGINE_URL},GLASSBOX_API_KEY=${GLASSBOX_API_KEY}" \
  --quiet
DEMO_URL="$(gcloud run services describe glassbox-demo --region "$REGION" --project "$PROJECT" --format='value(status.url)')"
echo "    demo live at: ${DEMO_URL}"

echo "==> 8/8  Domain mapping demo.glassboxengine.dev (does NOT go live until DNS points at it)"
gcloud beta run domain-mappings create \
  --service glassbox-demo --domain demo.glassboxengine.dev \
  --region "$REGION" --project "$PROJECT" 2>/dev/null || echo "    mapping exists"
echo ""
echo "    >>> Add these DNS record(s) at your glassboxengine.dev DNS provider:"
gcloud beta run domain-mappings describe --domain demo.glassboxengine.dev \
  --region "$REGION" --project "$PROJECT" \
  --format='table(status.resourceRecords[].name, status.resourceRecords[].type, status.resourceRecords[].rrdata)'

echo ""
echo "DONE. Verify after DNS propagates:"
echo "  open ${DEMO_URL}  (run 'Simulate all shoppers'),"
echo "  then sign in to https://glassboxengine.dev as demo-owner@glassboxengine.dev"
echo "  and check /dashboard/tracking + /dashboard/personas for the 'Demo Store' project."
