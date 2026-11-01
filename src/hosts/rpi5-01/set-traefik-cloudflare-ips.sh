#!/bin/bash
set -euo pipefail

SERVICES_DIR="$HOME/services"
EXTRA=("$@") # LAN, tailnet

v4=$(curl -fsS https://www.cloudflare.com/ips-v4)
v6=$(curl -fsS https://www.cloudflare.com/ips-v6)

ips=$(printf '%s\n' "$v4" "$v6" "${EXTRA[@]}" | paste -sd, -)

env_file="$SERVICES_DIR/traefik.env"
new="TRAEFIK_ENTRYPOINTS_WEBSECURE_FORWARDEDHEADERS_TRUSTEDIPS=$ips"

if [ -f "$env_file" ] && [ "$(cat "$env_file")" = "$new" ]; then
	echo "$(date -Is) Cloudflare ranges unchanged, skipping"
	exit 0
fi

tmp=$(mktemp)
echo "$new" >"$tmp"
mv "$tmp" "$env_file"

# env_file changes are only picked up on recreate, not restart
docker compose --project-directory "$SERVICES_DIR" up -d --force-recreate traefik

echo "$(date -Is) applied $(printf '%s\n' "$v4" "$v6" | wc -l) Cloudflare ranges + ${#EXTRA[@]} extra to traefik"
