data "bitwarden_secret" "k3s_vip" {
  key = "k3s_vip"
}

data "bitwarden_secret" "k3s_metallb_address_range" {
  key = "k3s_metallb_address_range"
}

locals {
  k3s_vip                   = data.bitwarden_secret.k3s_vip.value
  k3s_metallb_address_range = data.bitwarden_secret.k3s_metallb_address_range.value
}

module "k3s_master" {
  source = "./modules/k3s_master"

  lxc_ip              = module.proxmox_lxc[0].lxc_ip
  lxc_password        = module.proxmox_lxc[0].lxc_password
  k3s_vip             = local.k3s_vip
  k3s_metallb_ip_pool = local.k3s_metallb_address_range

  depends_on = [module.proxmox_lxc]
}

module "k3s_server" {
  count  = length(local.pm_lxc_ips) - 1
  source = "./modules/k3s_server"

  lxc_ip       = module.proxmox_lxc[count.index + 1].lxc_ip
  lxc_password = module.proxmox_lxc[count.index + 1].lxc_password

  k3s_vip   = local.k3s_vip
  k3s_token = module.k3s_master.k3s_token

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
