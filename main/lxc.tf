

variable "lxcs" {
  description = "LXC container configurations"
  type = list(object({
    vmid        = number
    ip          = string
    ip6         = string
  }))
}

data "bitwarden_secret" "pm_node_name" {
  key = "pm_node_name"
}

data "bitwarden_secret" "pm_user" {
  key = "pm_user"
}

data "bitwarden_secret" "pm_password" {
  key = "pm_password"
}

data "bitwarden_secret" "pm_lxc_gateway" {
  key = "pm_lxc_gateway"
}

locals {
  pm_node_name   = data.bitwarden_secret.pm_node_name.value
  pm_user        = data.bitwarden_secret.pm_user.value
  pm_password    = data.bitwarden_secret.pm_password.value
  pm_lxc_gateway = data.bitwarden_secret.pm_lxc_gateway.value
}

module "proxmox_lxc" {
  for_each = { for lxc in var.lxcs: lxc.vmid => lxc}

  source = "../modules/proxmox_lxc"

  pm_ip        = local.pm_ip
  pm_node_name = local.pm_node_name
  pm_user      = local.pm_user
  pm_password  = local.pm_password

  lxc_password = var.dev ? "password" : ""

  ip_gateway = local.pm_lxc_gateway

  config = each.value
}

locals {
  lxcs = values(module.proxmox_lxc)
}

output "pm_lxc_containers" {
  value = local.lxcs
  sensitive = true
}
