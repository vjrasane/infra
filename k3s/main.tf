data "bitwarden_secret" "cloudflare_domain" {
  key = "cloudflare_domain"
}

locals {
  lxcs        = data.terraform_remote_state.proxmox.outputs.pm_lxc_containers
  k3s_master  = local.lxcs[0]
  k3s_servers = slice(local.lxcs, 1, length(local.lxcs))
  k3s_fqdn    = "k3s.home.${data.bitwarden_secret.cloudflare_domain.value}"
}

module "k3s_master" {
  source = "./modules/k3s_master"

  lxc_config = {
    ip       = local.k3s_master.config.ip
    ip6      = local.k3s_master.config.ip6
    user     = "root"
    password = local.k3s_master.config.password
  }
  k3s_config = {
    vip          = var.k3s_vip
    fqdn         = local.k3s_fqdn
    cluster_cidr = var.cluster_cidr
    service_cidr = var.service_cidr
  }
}

module "k3s_server" {
  for_each = { for lxc in local.k3s_servers : lxc.config.vmid => lxc }
  source   = "./modules/k3s_server"

  lxc_ip       = each.value.config.ip
  lxc_ip6      = each.value.config.ip6
  lxc_password = each.value.config.password

  k3s_vip          = module.k3s_master.vip
  k3s_token        = module.k3s_master.k3s_token
  k3s_cluster_cidr = var.cluster_cidr
  k3s_service_cidr = var.service_cidr

  depends_on = [module.k3s_master]
}

locals {
  kube_config_yaml = replace(module.k3s_master.kube_config.content,
    "server: https://127.0.0.1:6443",
    "server: ${var.k3s_vip}:6443"
  )
}
