#!/usr/bin/env bash
set -e
set -o pipefail

script_dir=$(dirname "$(readlink -f "$0")")

source "$script_dir/utils.sh"

lxc_vmid="$1"

if [ -z "$lxc_vmid" ]; then
    echo "Usage: $0 <lxc_vmid>"
    exit 1
fi

uninstall_k3s() {
    local lxc_vmid="$1"
    clear_known_lxc_host "$lxc_vmid"

    execute_on_lxc "$lxc_vmid" <<EOF
if [ -f /usr/local/bin/k3s-uninstall.sh ]; then
    echo "Uninstalling k3s..."
    /usr/local/bin/k3s-uninstall.sh
else
    echo "k3s is not installed."
fi
EOF
}

for lxc_vmid in "$@"; do
    uninstall_k3s "$lxc_vmid"
done
