#!/usr/bin/env bash
set -euo pipefail

# Script to create Bitwarden auth token secret from Bitwarden vault
# Usage:
#   ./scripts/create-bw-auth-token.sh
#
# Fetches machine account token from password manager item:
# "homelab-machine-account-auth-token"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SEALED_SECRET_FILE="$SCRIPT_DIR/secrets/bw-auth-token-sealed.yaml"
ITEM_NAME="homelab-machine-account-auth-token"

# Check if bw CLI is installed
if ! command -v bw &> /dev/null; then
    echo "❌ Bitwarden CLI (bw) is not installed"
    echo "Install with: npm install -g @bitwarden/cli"
    exit 1
fi

# Check if kubeseal is installed
if ! command -v kubeseal &> /dev/null; then
    echo "❌ kubeseal is not installed"
    echo "Install from: https://github.com/bitnami-labs/sealed-secrets/releases"
    exit 1
fi

# Check if logged in
if ! bw login --check &>/dev/null; then
    echo "🔐 Logging into Bitwarden..."
    bw login
fi

# Check if unlocked
if [[ -z "${BW_SESSION:-}" ]]; then
    echo "🔓 Unlocking vault..."
    echo "Run: export BW_SESSION=\$(bw unlock --raw)"
    echo "Or provide password:"
    BW_SESSION=$(bw unlock --raw)
    export BW_SESSION
fi

echo "🔍 Fetching token from Bitwarden item: $ITEM_NAME"

# Get token from notes field
BW_TOKEN=$(bw get notes "$ITEM_NAME" 2>/dev/null || true)

if [[ -z "$BW_TOKEN" ]]; then
    echo "❌ Could not fetch token from Bitwarden item: $ITEM_NAME"
    echo "Make sure the item exists and contains the machine account token in the notes field"
    exit 1
fi

# Create secrets directory
mkdir -p "$(dirname "$SEALED_SECRET_FILE")"

echo "🔐 Creating and sealing secret..."

# Create and seal secret in one pipeline (no intermediate file)
kubectl create secret generic bw-auth-token \
    --from-literal=token="$BW_TOKEN" \
    --dry-run=client \
    -o yaml | \
kubeseal \
    --controller-name=sealed-secrets \
    --controller-namespace=kube-system \
    --scope cluster-wide \
    --format yaml > "$SEALED_SECRET_FILE"

echo "✅ Created sealed secret at: $SEALED_SECRET_FILE"
echo ""
echo "Next steps:"
echo "1. Commit the sealed secret to git (safe to commit!)"
echo "2. Deploy with: kubectl apply -k k8s/"
