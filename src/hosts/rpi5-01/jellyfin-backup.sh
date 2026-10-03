#!/bin/bash
set -euo pipefail

set -a
# shellcheck source=/dev/null
source ~/.env
set +a

music_dir="$HOME/shared/media/music"
config_dir="$HOME/services/jellyfin-config"
restic_host="jellyfin"

echo "Initializing restic repo (if needed)..."
restic snapshots || restic init

echo "Starting restic backup..."
restic backup --host "$restic_host" "$music_dir" "$config_dir"

echo "Backup complete. Pruning old snapshots..."
restic forget --host "$restic_host" --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune

echo "Done. Current snapshots:"
restic snapshots
