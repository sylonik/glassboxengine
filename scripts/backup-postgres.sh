#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/backup-postgres.sh
# Requires: DATABASE_URL env var, pg_dump installed
# Optional: BACKUP_DIR (default: ./backups)

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/glassbox_${TIMESTAMP}.dump"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL environment variable is required"
  exit 1
fi

mkdir -p "$BACKUP_DIR"

echo "Starting PostgreSQL backup..."
pg_dump "$DATABASE_URL" \
  --format=custom \
  --compress=zstd \
  --verbose \
  --file="$BACKUP_FILE"

echo "Backup saved to: $BACKUP_FILE"
echo "Size: $(du -h "$BACKUP_FILE" | cut -f1)"
