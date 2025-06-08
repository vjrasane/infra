#!/usr/bin/env bash
set -eou pipefail

script_dir=$(dirname "$(readlink -f "$0")")

kube_config_file="/etc/rancher/k3s/k3s.yaml"

source "$script_dir/.env"
source "$script_dir/utils.sh"

lxc_vmid="$1"

: "${lxc_vmid:?LXC VMID is required}"
: "${K3S_VIP:?K3S VIP is required}"

clear_known_lxc_host "$lxc_vmid" &>/dev/null

kube_config=$(execute_on_lxc "$lxc_vmid" "cat $kube_config_file")

echo "$kube_config" | sed "s/server: https:\/\/127.0.0.1:6443/server: https:\/\/${K3S_VIP}:6443/"
