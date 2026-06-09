#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/backup-clickhouse.sh
# Requires: CLICKHOUSE_URL env var (e.g., http://localhost:8123)
# Optional: BACKUP_DIR (default: ./backups)

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

if [ -z "${CLICKHOUSE_URL:-}" ]; then
  echo "ERROR: CLICKHOUSE_URL environment variable is required"
  exit 1
fi

mkdir -p "$BACKUP_DIR"

TABLES=("feedback_events" "recommendation_events")

for TABLE in "${TABLES[@]}"; do
  BACKUP_FILE="${BACKUP_DIR}/clickhouse_${TABLE}_${TIMESTAMP}.json.gz"
  echo "Backing up ${TABLE}..."

  curl -s "${CLICKHOUSE_URL}/?query=SELECT%20*%20FROM%20glassbox.${TABLE}%20FORMAT%20JSONEachRow" \
    | gzip > "$BACKUP_FILE"

  echo "  Saved to: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"
done

echo "ClickHouse backup complete."
