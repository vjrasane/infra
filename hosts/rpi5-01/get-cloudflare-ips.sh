#!/bin/bash
set -euo pipefail

USAGE="Usage: $0 <outfile>"
OUT=${1:?$USAGE}

ips=$(curl -fsS https://www.cloudflare.com/ips-v4 | grep -v '^$' | paste -sd, -)
new="CF_TRUSTED_IPS=${ips}"

if [ "$(cat "$OUT" 2>/dev/null || true)" != "$new" ]; then
  echo "$new" >"$OUT"
  echo "Trusted IPs updated: $new"
fi
