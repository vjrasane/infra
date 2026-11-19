#!/bin/bash
set -euo pipefail
[ "$(id -u)" -eq 0 ] || exec sudo -n "$0" "$@"

USAGE="Usage: $0 <wan> <port> [<extra-ip-or-cidr>...]"

WAN=${1:?$USAGE}
PORT=${2:?$USAGE}
shift 2
EXTRA=("$@") # LAN, tailnet
CHAIN=CF_ORIGIN

raw4=$(curl -fsS https://www.cloudflare.com/ips-v4)
raw6=$(curl -fsS https://www.cloudflare.com/ips-v6)
mapfile -t ips4 <<<"$raw4"
mapfile -t ips6 <<<"$raw6"
for ip in "${EXTRA[@]}"; do
  [[ $ip == *:* ]] && ips6+=("$ip") || ips4+=("$ip")
done

apply() {
  local ipt=$1
  shift

  "$ipt" -N "$CHAIN" 2>/dev/null || "$ipt" -F "$CHAIN"
  for ip in "$@"; do "$ipt" -A "$CHAIN" -s "$ip" -j RETURN; done
  "$ipt" -A "$CHAIN" -j DROP

  "$ipt" -N DOCKER-USER 2>/dev/null || true
  "$ipt" -C DOCKER-USER -i "$WAN" -p tcp --dport "$PORT" -j "$CHAIN" 2>/dev/null ||
    "$ipt" -I DOCKER-USER 1 -i "$WAN" -p tcp --dport "$PORT" -j "$CHAIN"
}

apply iptables "${ips4[@]}"
[ -e /proc/net/if_inet6 ] && command -v ip6tables >/dev/null && apply ip6tables "${ips6[@]}"

echo "$(date -Is) applied Cloudflare v4+v6 to WAN $WAN port $PORT"
