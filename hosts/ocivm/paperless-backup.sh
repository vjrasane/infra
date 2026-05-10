#!/bin/bash
set -euo pipefail

# shellcheck source=/dev/null
source ~/.env

container_export_dir="/usr/src/paperless/export"
host_export_dir="/mnt/data/paperless/export"
restic_host="paperless"

echo "Exporting documents from Paperless..."
docker exec paperless document_exporter "$container_export_dir" --delete --no-thumbnail --no-color

echo "Initializing restic repo (if needed)..."
restic snapshots || restic init

echo "Starting restic backup..."
restic backup --host "$restic_host" "$host_export_dir"

echo "Backup complete. Pruning old snapshots..."
restic forget --host "$restic_host" --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune

echo "Done. Current snapshots:"
restic snapshots
