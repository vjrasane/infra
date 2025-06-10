

data "bitwarden_secret" "pm_password" {
  key = "pm_password"
}


module "proxmox_lxc" {
  for_each = { for lxc in var.lxcs : lxc.vmid => lxc }

  source = "./modules/proxmox_lxc"

  pm_ip        = local.pm_ip
  pm_node_name = var.pm_node_name
  pm_user      = var.pm_user
  pm_password  = data.bitwarden_secret.pm_password.value

  config = each.value
}

locals {
  lxcs = values(module.proxmox_lxc)
}
