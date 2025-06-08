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

MANIFEST_DIR="/var/lib/rancher/k3s/server/manifests"

###############################################################################
# 1. Prepare manifests directory (idempotent)
###############################################################################
echo "🏗  Creating manifests directory $MANIFEST_DIR"
# 0755 is conventional and harmless.  Set ownership explicitly.
install -d -m 0755 -o root -g root "$MANIFEST_DIR"

echo "⬇️  Downloading MetalLB and kube-vip manifests"
curl -sfL \
    https://raw.githubusercontent.com/metallb/metallb/v0.14.9/config/manifests/metallb-native.yaml \
    -o "$MANIFEST_DIR/metallb-native.yaml"

curl -sfL \
    https://kube-vip.io/manifests/rbac.yaml \
    -o "$MANIFEST_DIR/kube-vip-rbac.yaml"

###############################################################################
# 2. Download official K3s installer
###############################################################################
echo "⬇️  Fetching K3s installer"
curl -sfL https://get.k3s.io -o /tmp/get-k3s.sh
chmod 0755 /tmp/get-k3s.sh

###############################################################################
# 3. Install K3s (only if not already present)
###############################################################################
if [[ ! -f /usr/local/bin/k3s-uninstall.sh ]]; then
    echo "🚀  Installing first K3s server (cluster-init)"
    /tmp/get-k3s.sh server \
        --cluster-init \
        --disable traefik \
        --disable servicelb \
        --disable metrics-server \
        --flannel-iface eth0 \
        --node-ip "${node_ip}" \
        --tls-san "${vip}" \
        --cluster-cidr "${cluster_cidr}" \
        --service-cidr "${service_cidr}"
    echo "✅  K3s already installed – skipping installer step"
fi

###############################################################################
# 4. Ensure k3s service is enabled and running
###############################################################################
echo "🔧  Enabling and starting k3s.service"
systemctl daemon-reload
systemctl enable --now k3s

echo "🎉  K3s first-server bootstrap complete."
