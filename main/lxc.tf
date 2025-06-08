

variable "lxcs" {
  description = "LXC container configurations"
  type = list(object({
    vmid    = number
    ip      = string
    ip6     = string
    gateway = string
    rootfs = object({
      size    = string
      storage = string
    })
  }))
}

variable "pm_node_name" {
  description = "Proxmox node name"
  type        = string
}

variable "pm_user" {
  description = "Proxmox user"
  type        = string
}

data "bitwarden_secret" "pm_password" {
  key = "pm_password"
}

locals {
  pm_password    = data.bitwarden_secret.pm_password.value
}

module "proxmox_lxc" {
  for_each = { for lxc in var.lxcs : lxc.vmid => lxc }

  source = "../modules/proxmox_lxc"

  pm_ip        = local.pm_ip
  pm_node_name = var.pm_node_name
  pm_user      = var.pm_user
  pm_password  = local.pm_password

  lxc_password = var.dev ? "password" : ""

  config = each.value
}

locals {
  lxcs = values(module.proxmox_lxc)
}
