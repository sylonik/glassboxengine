#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/restore-postgres.sh <backup_file>
# Requires: DATABASE_URL env var, pg_restore installed

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL environment variable is required"
  exit 1
fi

if [ -z "${1:-}" ]; then
  echo "Usage: $0 <backup_file>"
  echo "Example: $0 ./backups/glassbox_20260505_120000.dump"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "WARNING: This will overwrite existing data in the target database."
echo "Restoring from: $BACKUP_FILE"
read -p "Continue? (y/N) " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

pg_restore "$DATABASE_URL" \
  --clean \
  --if-exists \
  --verbose \
  "$BACKUP_FILE"

echo "Restore complete."
