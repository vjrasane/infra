#!/usr/bin/env bash
set -e
set -o pipefail

script_dir=$(dirname "$(readlink -f "$0")")
remote_dir="${script_dir}/remote"

remote_script="${remote_dir}/install_k3s_server.sh"

token_file="/var/lib/rancher/k3s/server/token"

source "$script_dir/.env"
source "$script_dir/utils.sh"

master_vmid="$1"
shift

: "${master_vmid:?Master VMID is required}"
: "${K3S_VIP:?K3S VIP is required}"
: "${K3S_CLUSTER_CIDR:?K3S Cluster CIDR is required}"
: "${K3S_SERVICE_CIDR:?K3S Service CIDR is required}"

token=$(execute_on_lxc "$master_vmid" "cat $token_file")

install_k3s() {
    local lxc_vmid="$1"

    run_script_on_lxc "$lxc_vmid" "$remote_script" \
        "$(get_node_ip $lxc_vmid)" \
        "$K3S_VIP" \
        "$K3S_CLUSTER_CIDR" \
        "$K3S_SERVICE_CIDR" \
        "$token"
}

for lxc_vmid in "$@"; do
    install_k3s "$lxc_vmid"
done
