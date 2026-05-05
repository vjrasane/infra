#!/bin/bash
set -euo pipefail

AD_INDEX=${1:?Usage: $0 <ad-index: 0, 1, or 2>}

SHAPE="VM.Standard.A1.Flex"
OCPUS=4
MEMORY_GB=24
OS="Canonical Ubuntu"
SSH_KEY_FILE="$HOME/.ssh/id_ed25519.pub"

COMPARTMENT_ID=$(grep tenancy ~/.oci/config | cut -d= -f2)

echo "Checking for existing A1 instances..."
EXISTING=$(oci compute instance list \
	--compartment-id "$COMPARTMENT_ID" \
	--query "data[?shape=='$SHAPE' && \"lifecycle-state\"=='RUNNING'].id | [0]" \
	--raw-output 2>/dev/null || true)

if [ -n "$EXISTING" ] && [ "$EXISTING" != "null" ] && [ "$EXISTING" != "None" ]; then
	echo "A1 instance already exists: $EXISTING"
	exit 0
fi

AD=$(oci iam availability-domain list \
	--compartment-id "$COMPARTMENT_ID" \
	--query "data[$AD_INDEX].name" --raw-output)

echo "Using AD: $AD"

IMAGE_ID=$(oci compute image list \
	--compartment-id "$COMPARTMENT_ID" \
	--shape "$SHAPE" \
	--operating-system "$OS" \
	--sort-by TIMECREATED \
	--sort-order DESC \
	--query 'data[0].id' \
	--raw-output)

SUBNET_ID=$(oci network subnet list \
	--compartment-id "$COMPARTMENT_ID" \
	--query 'data[0].id' \
	--raw-output)

echo "Image: $IMAGE_ID"
echo "Subnet: $SUBNET_ID"
echo "Launching in $AD..."

OUTPUT=$(oci compute instance launch \
	--availability-domain "$AD" \
	--compartment-id "$COMPARTMENT_ID" \
	--shape "$SHAPE" \
	--shape-config "{\"ocpus\": $OCPUS, \"memoryInGBs\": $MEMORY_GB}" \
	--image-id "$IMAGE_ID" \
	--subnet-id "$SUBNET_ID" \
	--ssh-authorized-keys-file "$SSH_KEY_FILE" \
	--assign-public-ip true \
	--display-name "ocivm-a1" \
	2>&1) && {
	echo "$OUTPUT"
	echo "Instance created successfully!"
	exit 0
}

CODE=$(echo "$OUTPUT" | sed -n '/^{/,/^}/p' | jq -r '.code // empty' 2>/dev/null || true)

if [ "$CODE" = "InternalError" ] || [ "$CODE" = "LimitExceeded" ]; then
	echo "Out of capacity in $AD"
	exit 1
fi

echo "$OUTPUT"
echo "Unexpected error, aborting."
exit 2
