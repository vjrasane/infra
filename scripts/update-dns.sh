#!/bin/bash
set -euo pipefail

source ~/.env

RECORD_NAME=${1:?Usage: $0 <record-name>}
IP=$(tailscale ip -4)

RECORD=$(curl -sf \
  -H "Authorization: Bearer $CF_DNS_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/dns_records?name=$RECORD_NAME&type=A")

RECORD_ID=$(echo "$RECORD" | jq -r '.result[0].id')
CURRENT_IP=$(echo "$RECORD" | jq -r '.result[0].content')

if [ "$CURRENT_IP" = "$IP" ]; then
  exit 0
fi

curl -sf -X PUT \
  -H "Authorization: Bearer $CF_DNS_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"A\",\"name\":\"$RECORD_NAME\",\"content\":\"$IP\",\"proxied\":false}" \
  "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/dns_records/$RECORD_ID" > /dev/null

echo "Updated $RECORD_NAME: $CURRENT_IP -> $IP"
