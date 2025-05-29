data "bitwarden_secret" "k3s_vip" {
  key = "k3s_vip"
}

data "bitwarden_secret" "cloudflare_domain" {
  key = "cloudflare_domain"
}

locals {
  k3s_master       = local.lxcs[0]
  k3s_servers      = slice(local.lxcs, 1, length(local.lxcs))
  k3s_vip          = data.bitwarden_secret.k3s_vip.value
  k3s_fqdn         = "k3s.home.${data.bitwarden_secret.cloudflare_domain.value}"
  k3s_cluster_cidr = "10.42.0.0/16,2001:cafe:42::/56"
  k3s_service_cidr = "10.43.0.0/16,2001:cafe:43::/112"
}

module "k3s_master" {
  source = "../modules/k3s_master"

  lxc_config = {
    ip       = local.k3s_master.config.ip
    ip6      = local.k3s_master.config.ip6
    user     = "root"
    password = local.k3s_master.config.password
  }
  k3s_config = {
    vip          = local.k3s_vip
    fqdn         = local.k3s_fqdn
    cluster_cidr = local.k3s_cluster_cidr
    service_cidr = local.k3s_service_cidr
  }

  depends_on = [module.proxmox_lxc]
}

module "k3s_server" {
  for_each = { for lxc in local.k3s_servers : lxc.config.vmid => lxc }
  source   = "../modules/k3s_server"

  lxc_ip       = each.value.config.ip
  lxc_ip6      = each.value.config.ip6
  lxc_password = each.value.config.password

  k3s_vip          = module.k3s_master.vip
  k3s_token        = module.k3s_master.k3s_token
  k3s_cluster_cidr = local.k3s_cluster_cidr
  k3s_service_cidr = local.k3s_service_cidr

  depends_on = [module.k3s_master]
}

resource "bitwarden_secret" "k3s_kube_config" {
  key = "k3s_kube_config"
  value = replace(module.k3s_master.kube_config.content,
    "server: https://127.0.0.1:6443",
    "server: https://${local.k3s_vip}:6443"
  )
  project_id = resource.bitwarden_project.automated.id
  note       = "K3s kube config"
}

output "config" {
  value = {
    vip  = local.k3s_vip
    fqdn = local.k3s_fqdn
  }
}

output "kube_config" {
  value = module.k3s_master.kube_config
  sensitive = true
}
