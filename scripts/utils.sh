script_dir=$(dirname "$(readlink -f "$0")")
repo_dir=$(dirname "$script_dir")
main_dir="${repo_dir}/main"

clear_known_host() {
    local host="${1}"
    ssh-keygen -f "$HOME/.ssh/known_hosts" -R "$host" 2>/dev/null || true
}

execute_command() {
    local host="${HOST}"
    local user="${USER}"
    local password="${PASSWORD}"

    sshpass -p "$password" ssh -o StrictHostKeyChecking=no "$user@$host" "$@"
}

copy_file() {
    local host="${HOST}"
    local user="${USER}"
    local password="${PASSWORD}"

    local source="$1"
    shift
    local target="$1"
    shift

    sshpass -p "$password" scp -o StrictHostKeyChecking=no "$source" "$user@$host:$target"
}

run_script() {
    export HOST
    export USER
    export PASSWORD

    local source="$1"
    shift
    local args="$@"
    local tmpdir=$(execute_command "mktemp -d")
    local target="$tmpdir/$(basename "$source")"
    copy_file "$source" "$target"
    execute_command "chmod +x $target && $target $args"
}

get_output_json() {
    local output="$1"
    cd "$main_dir"
    tofu output --json "$output"
}

get_lxc_config() {
    local lxc_vmid="$1"
    local output=$(get_output_json "pm_lxc_containers")
    echo "$output" | jq ".[].config | select(.vmid == $lxc_vmid)"
}

get_node_ip() {
    local lxc_vmid="$1"
    local lxc_config=$(get_lxc_config "$lxc_vmid")
    local lxc_ip=$(echo "$lxc_config" | jq -r '.ip')
    local lxc_ip6=$(echo "$lxc_config" | jq -r '.ip6')
    echo "${lxc_ip},${lxc_ip6}"
}

wait_for_confirm() {
    local message="$1"
    while true; do
        read -r -p "$message [y/Y]" reply
        case "$reply" in
        [Yy])
            break
            ;;
        *) echo "Please type y or Y to continue." ;;
        esac
    done
}

execute_on_lxc() {
    local lxc_vmid="$1"
    shift
    local command="$@"

    local lxc_config=$(get_lxc_config "$lxc_vmid")
    local lxc_ip=$(echo "$lxc_config" | jq -r '.ip')
    local lxc_user="root"
    local lxc_password=$(echo "$lxc_config" | jq -r '.password')

    HOST=$lxc_ip USER=$lxc_user PASSWORD=$lxc_password execute_command "$@"
}

run_script_on_lxc() {
    local lxc_vmid="$1"
    shift
    local script_path="$1"
    shift
    local args="$@"

    local lxc_config=$(get_lxc_config "$lxc_vmid")
    local lxc_ip=$(echo "$lxc_config" | jq -r '.ip')
    local lxc_user="root"
    local lxc_password=$(echo "$lxc_config" | jq -r '.password')

    HOST=$lxc_ip USER=$lxc_user PASSWORD=$lxc_password run_script "$script_path" "$@"
}

ssh_to_lxc() {
    local lxc_vmid="$1"

    local lxc_config=$(get_lxc_config "$lxc_vmid")
    local host=$(echo "$lxc_config" | jq -r '.ip')
    local user="root"
    local password=$(echo "$lxc_config" | jq -r '.password')

    sshpass -p "$password" ssh -o StrictHostKeyChecking=no "$user@$host"
}

clear_known_lxc_host() {
    local lxc_vmid="$1"
    local lxc_config=$(get_lxc_config "$lxc_vmid")
    local lxc_ip=$(echo "$lxc_config" | jq -r '.ip')

    clear_known_host "$lxc_ip"
}

copy_file_to_lxc() {
    local lxc_vmid="$1"
    shift
    local source="$1"
    shift
    local target="$1"
    shift

    local lxc_config=$(get_lxc_config "$lxc_vmid")
    local lxc_ip=$(echo "$lxc_config" | jq -r '.ip')
    local lxc_user="root"
    local lxc_password=$(echo "$lxc_config" | jq -r '.password')

    HOST=$lxc_ip USER=$lxc_user PASSWORD=$lxc_password copy_file "$source" "$target"
}

get_kube_config_from_lxc() {
    local lxc_vmid="$1"
    shift
    local k3s_vip="$1"
    shift

    local kube_config_file="/etc/rancher/k3s/k3s.yaml"

    kube_config=$(execute_on_lxc "$lxc_vmid" "cat $kube_config_file")

    echo "$kube_config" | sed "s/server: https:\/\/127.0.0.1:6443/server: https:\/\/${k3s_vip}:6443/"
}
