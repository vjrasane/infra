#!/usr/bin/env bash
# simple-join-k3s-server.sh
#
# Positional arguments (exactly five, in order):
#   1) VIP            – Cluster virtual IP advertised by kube-vip
#   2) CLUSTER_CIDR   – Pod network (e.g. 10.42.0.0/16)
#   3) SERVICE_CIDR   – Service network (e.g. 10.43.0.0/16)
#   4) NODE_IP        – This node’s primary IP
#   5) K3S_TOKEN      – Node-join token from the first server
#
# Runs under Terraform remote-exec; exits non-zero on any failure.

set -euo pipefail

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
        --cluster-cidr "${cluster_cidr}" \
        --service-cidr "${service_cidr}" \
        --node-ip "${node_ip}" \
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
