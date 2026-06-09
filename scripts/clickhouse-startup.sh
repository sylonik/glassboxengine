#!/bin/bash
# Startup script for the self-hosted ClickHouse VM (Container-Optimized OS).
#
# Runs the official ClickHouse server as a Docker container, bound to the host's
# private IP on 8123 (HTTP) / 9000 (native). The VM has no external IP; only the
# VPC (Cloud Run via the serverless connector + the workload subnet) can reach it,
# gated by the `allow-clickhouse-internal` firewall rule.
#
# CLICKHOUSE_SKIP_USER_SETUP=1 makes the built-in `default` user accept
# passwordless connections from any host inside the VPC (mirrors the CI/local
# setup). Data persists on the boot disk under /var/lib/clickhouse.
set -euo pipefail

CH_IMAGE="clickhouse/clickhouse-server:24.8"
CH_NAME="clickhouse"

# Idempotent: (re)create the container on every boot, reusing the data volume.
if docker inspect "${CH_NAME}" >/dev/null 2>&1; then
  docker start "${CH_NAME}" || true
  exit 0
fi

mkdir -p /var/lib/clickhouse

docker run -d \
  --name "${CH_NAME}" \
  --restart always \
  --ulimit nofile=262144:262144 \
  -p 8123:8123 \
  -p 9000:9000 \
  -e CLICKHOUSE_SKIP_USER_SETUP=1 \
  -v /var/lib/clickhouse:/var/lib/clickhouse \
  "${CH_IMAGE}"
