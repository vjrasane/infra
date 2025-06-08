#!/usr/bin/env bash
set -euo pipefail

script_dir=$(dirname "$(readlink -f "$0")")

source "$script_dir/utils.sh"

lxc_vmid="$1"

: "${lxc_vmid:?LXC VMID is required}"

clear_known_lxc_host "$lxc_vmid"

ssh_to_lxc "$lxc_vmid"
