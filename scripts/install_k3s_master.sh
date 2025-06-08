#!/usr/bin/env bash
set -eou pipefail

script_dir=$(dirname "$(readlink -f "$0")")
remote_dir="${script_dir}/remote"
template_dir="${script_dir}/templates"

remote_script="${remote_dir}/install_k3s_master.sh"
kube_vip_template="${template_dir}/kube-vip.yaml.j2"
kube_vip_manifest="/var/lib/rancher/k3s/server/manifests/kube-vip.yaml"

source "$script_dir/.env"
source "$script_dir/utils.sh"

lxc_vmid="$1"

: "${lxc_vmid:?LXC VMID is required}"
: "${K3S_VIP:?K3S VIP is required}"
: "${K3S_CLUSTER_CIDR:?K3S Cluster CIDR is required}"
: "${K3S_SERVICE_CIDR:?K3S Service CIDR is required}"

clear_known_lxc_host "$lxc_vmid"

run_script_on_lxc "$lxc_vmid" "$remote_script" \
    "$(get_node_ip $lxc_vmid)" \
    "$K3S_VIP" \
    "$K3S_CLUSTER_CIDR" \
    "$K3S_SERVICE_CIDR"

tmp_manifest=$(mktemp)
cat "$kube_vip_template" | sed "s/{{k3s_vip}}/${K3S_VIP}/" >"$tmp_manifest"
copy_file_to_lxc "$lxc_vmid" \
    "$tmp_manifest" \
    "$kube_vip_manifest"
