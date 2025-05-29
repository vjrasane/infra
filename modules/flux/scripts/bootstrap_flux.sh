#!/usr/bin/env bash

set -euo pipefail

###############################################################################
# 1. Install flux cli
###############################################################################
echo "⬇️  Installing Flux CLI"
curl -s https://fluxcd.io/install.sh | sudo bash

###############################################################################
# 2. Bootstrap Flux with the Git repository
################################################################################
echo "🚀  Bootstrapping Flux with Git repository"
KUBECONFIG="/etc/rancher/k3s/k3s.yaml" \
    GITHUB_TOKEN="${git_token}" \
    flux bootstrap github \
    --token-auth \
    --owner="${git_owner}" \
    --repository="${git_repo}" \
    --branch="${git_branch}" \
    --path="${git_path}" \
    --personal

echo "🎉  Flux bootstrap complete."
