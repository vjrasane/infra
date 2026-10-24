#!/bin/bash
set -euo pipefail

container_export_dir="/usr/src/paperless/export"
# mounted host dir
# host_export_dir="/mnt/data/paperless/export"

echo "Exporting documents from Paperless..."
docker exec paperless document_exporter "$container_export_dir" --delete --no-thumbnail --no-color
echo "Done"
