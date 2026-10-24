#!/bin/bash
set -euo pipefail
[ "$(id -u)" -eq 0 ] || exec sudo -n "$0" "$@"

USAGE="Usage: $0 <port> [<extra-ip-or-cidr>...]"

PORT=${1:?$USAGE}
shift
EXTRA=("$@") # LAN, tailnet
CHAIN=CF_ORIGIN

ips=$(curl -fsS https://www.cloudflare.com/ips-v4)

# Own chain: rebuild it wholesale, never flush DOCKER-USER itself
iptables -N "$CHAIN" 2>/dev/null || iptables -F "$CHAIN"
for ip in $ips "${EXTRA[@]}"; do
	iptables -A "$CHAIN" -s "$ip" -j RETURN
done
iptables -A "$CHAIN" -j DROP

# Docker creates DOCKER-USER on start but never flushes it; create it if we run first
iptables -N DOCKER-USER 2>/dev/null || true
iptables -C DOCKER-USER -p tcp --dport "$PORT" -j "$CHAIN" 2>/dev/null ||
	iptables -I DOCKER-USER 1 -p tcp --dport "$PORT" -j "$CHAIN"

echo "$(date -Is) applied $(echo "$ips" | wc -l) Cloudflare ranges + ${#EXTRA[@]} extra"
