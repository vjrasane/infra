
data "bitwarden_secret" "pm_lxc_ips" {
  key = "pm_lxc_ips"
}

locals {
  pm_lxc_ips = jsondecode(data.bitwarden_secret.pm_lxc_ips.value)
}

resource "tls_private_key" "lxc_ssh_key" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "random_password" "lxc_password" {
  length  = 16
  special = true
}

resource "bitwarden_secret" "lxc_password" {
  key        = "lxc_password"
  value      = random_password.lxc_password.result
  project_id = resource.bitwarden_project.automated.id
  note       = "LXC password for Proxmox"
}

resource "bitwarden_secret" "lxc_ssh_key" {
  key        = "lxc_ssh_key"
  value      = tls_private_key.lxc_ssh_key.private_key_pem
  project_id = resource.bitwarden_project.automated.id
  note       = "SSH key for LXC containers"
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
  count = length(local.pm_lxc_ips)

  source = "./modules/proxmox_lxc"

  pm_ip        = local.pm_ip
  pm_node_name = local.pm_node_name
  pm_user      = local.pm_user
  pm_password  = local.pm_password

  lxc_ip              = local.pm_lxc_ips[count.index]
  lxc_vmid            = 100 + count.index
  lxc_default_gateway = local.pm_lxc_gateway
  lxc_password        = random_password.lxc_password.result

  public_key_openssh = tls_private_key.lxc_ssh_key.public_key_openssh
}
