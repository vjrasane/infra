#!/usr/bin/env bash
set -euo pipefail

# Script to create Bitwarden auth token secret from Bitwarden vault
# Usage:
#   ./scripts/create-bw-auth-token.sh
#
# Fetches machine account token from password manager item:
# "homelab-machine-account-auth-token"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SECRET_FILE="$SCRIPT_DIR/secrets/bw-auth-token.yaml"
ITEM_NAME="homelab-machine-account-auth-token"

# Check if bw CLI is installed
if ! command -v bw &> /dev/null; then
    echo "❌ Bitwarden CLI (bw) is not installed"
    echo "Install with: npm install -g @bitwarden/cli"
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
mkdir -p "$(dirname "$SECRET_FILE")"

# Create secret using kubectl
kubectl create secret generic bw-auth-token \
    --from-literal=token="$BW_TOKEN" \
    --dry-run=client \
    -o yaml > "$SECRET_FILE"

echo "✅ Created secret at: $SECRET_FILE"
echo ""
echo "Next steps:"
echo "1. Commit the secret to git"
echo "2. Deploy with: kubectl apply -k k8s/"
