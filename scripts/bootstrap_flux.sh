#!/usr/bin/env bash
set -eou pipefail

script_dir=$(dirname "$(readlink -f "$0")")
template_dir="${script_dir}/templates"
repo_dir=$(dirname "$script_dir")
kubernetes_dir="${repo_dir}/kubernetes"

kube_config_file="${repo_dir}/.kube/config"
sops_age_key_template="${template_dir}/sops-age-key.yaml.j2"
bw_auth_token_template="${template_dir}/bw-auth-token.yaml.j2"
bw_auth_token_secret="${kubernetes_dir}/secrets/bw-auth-token.yaml"

source "$script_dir/.env"
source "$script_dir/utils.sh"

lxc_vmid="$1"

: "${lxc_vmid:?LXC VMID is required}"
: "${K3S_VIP:?K3S VIP is required}"
: "${BWS_ACCESS_TOKEN:?Bitwarden Auth Token is required}"
: "${GITHUB_TOKEN:?GitHub Token is required}"

private_key=$(age-keygen 2>/dev/null | tail -n 1)
public_key=$(age-keygen -y <<<"$private_key")

clear_known_lxc_host "$lxc_vmid" &>/dev/null

get_kube_config_from_lxc "$lxc_vmid" "$K3S_VIP" >"$kube_config_file"

plaintext=$(cat "$bw_auth_token_template" | sed "s/{{auth_token}}/${BWS_ACCESS_TOKEN}/")
ciphertext=$(sops -e --input-type yaml --output-type yaml --encrypted-regex '^(auth-token)$' --age "${public_key}" --config /dev/null /dev/stdin <<<"${plaintext}")
echo "$ciphertext" >"$bw_auth_token_secret"

value=$(echo $private_key | base64 | tr -d '\n')
secret=$(cat "$sops_age_key_template" | sed "s/{{private_key}}/${value}/")
KUBECONFIG="$kube_config_file" kubectl create namespace flux-system \
    --dry-run=client -o yaml | kubectl apply -f -
KUBECONFIG="$kube_config_file" kubectl apply -f - <<<"$secret"

wait_for_confirm "Secret generated. Please commit and push changes. Done?"

flux bootstrap github \
    --owner=vjrasane \
    --repository=infra \
    --branch=main \
    --path=kubernetes/cluster \
    --personal \
    --kubeconfig="$kube_config_file"
