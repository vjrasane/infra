#!/bin/bash
set -euo pipefail

restic_host="$1"
shift

echo "Initializing restic repo (if needed)..."
restic snapshots || restic init

echo "Starting restic backup..."
restic backup --host "$restic_host" "$@"

echo "Backup complete. Pruning old snapshots..."
restic forget --host "$restic_host" --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune

echo "Done. Current snapshots:"
restic snapshots
