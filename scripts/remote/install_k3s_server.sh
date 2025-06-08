#!/usr/bin/env bash
set -euo pipefail

node_ip="${1}"
shift
vip="${1}"
shift
cluster_cidr="${1}"
shift
service_cidr="${1}"
shift
token="${1}"
shift

###############################################################################
# 1. Wait for API server on the VIP :6443 (timeout 300 s)
###############################################################################
echo "⌛ Waiting for API server on ${vip}:6443 (timeout 300 s)…"
start=$(date +%s)
until (exec 3<>/dev/tcp/"${vip}"/6443) 2>/dev/null; do
    if (($(date +%s) - start > 300)); then
        echo "❌ Timed out waiting for ${vip}:6443" >&2
        exit 1
    fi
    sleep 2
done
echo "✅ API reachable on VIP."

###############################################################################
# 2. Fetch the official K3s installer
###############################################################################
curl -sfL https://get.k3s.io -o /tmp/get-k3s.sh
chmod 0755 /tmp/get-k3s.sh

###############################################################################
# 3. Join the existing cluster (idempotent)
###############################################################################
if [[ ! -f /usr/local/bin/k3s-uninstall.sh ]]; then
    echo "🚀 Installing K3s server to join cluster via VIP"
    /tmp/get-k3s.sh server \
        --disable traefik \
        --disable servicelb \
        --flannel-iface eth0 \
        --server "https://${vip}:6443" \
        --node-ip "${node_ip}" \
        --cluster-cidr "${cluster_cidr}" \
        --service-cidr "${service_cidr}" \
        --token "${token}"
else
    echo "✔ K3s already installed – skipping installer step"
fi

###############################################################################
# 4. Ensure k3s service is enabled & running
###############################################################################
systemctl daemon-reload
systemctl enable --now k3s

echo "🎉 Join-node bootstrap complete."
