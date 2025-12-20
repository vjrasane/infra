#!/usr/bin/env bash
set -euo pipefail

# Script to set up age encryption key for SOPS
# Usage: ./scripts/setup-age-key.sh

AGE_DIR="$HOME/.config/sops/age"
AGE_KEY_FILE="$AGE_DIR/keys.txt"

# Check if age is installed
if ! command -v age-keygen &> /dev/null; then
    echo "❌ age is not installed"
    echo "Install with: brew install age  (macOS)"
    echo "           or: apt install age   (Ubuntu)"
    exit 1
fi

# Check if key already exists
if [[ -f "$AGE_KEY_FILE" ]]; then
    echo "⚠️  Age key already exists at: $AGE_KEY_FILE"
    echo ""
    echo "Public key:"
    grep "# public key:" "$AGE_KEY_FILE" || echo "Could not extract public key"
    echo ""
    read -p "Do you want to generate a new key? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 0
    fi
fi

# Create directory
mkdir -p "$AGE_DIR"

# Generate new key
echo "🔑 Generating new age key..."
age-keygen -o "$AGE_KEY_FILE"

# Set restrictive permissions
chmod 600 "$AGE_KEY_FILE"

# Display public key
AGE_PUBLIC_KEY=$(grep "# public key:" "$AGE_KEY_FILE" | awk '{print $4}')

echo ""
echo "✅ Age key generated successfully!"
echo "📁 Private key location: $AGE_KEY_FILE"
echo "🔑 Public key: $AGE_PUBLIC_KEY"
echo ""
echo "⚠️  IMPORTANT: Back up your private key securely!"
echo "   Without it, you cannot decrypt secrets."
echo ""
echo "Next step: Create Bitwarden auth token with:"
echo "  ./scripts/create-bw-auth-token.sh"
