
terraform {
  required_providers {
    proxmox = {
      source = "telmate/proxmox"
    }

    ansible = {
      source = "ansible/ansible"
    }
  }
}

locals {
  lxc_ostemplate = "local:vztmpl/ubuntu-24.10-standard_24.10-1_amd64.tar.zst"
  lxc_storage    = "local-zfs"
}

variable "pm_ip" {
  type = string
}

variable "pm_node_name" {
  type = string
}

variable "pm_user" {
  type    = string
  default = "root"
}

variable "pm_password" {
  type      = string
  sensitive = true
}

variable "ip_gateway" {
  type = string
}

variable "lxc_password" {
  type      = string
  sensitive = true
  default   = ""
}

resource "random_password" "lxc_password" {
  length  = 16
  special = true

  keepers = {
    password = var.lxc_password
  }
}

resource "tls_private_key" "lxc_ssh_key" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

variable "config" {
  type = object({
    vmid = number
    ip   = string
    ip6  = string
  })
}

variable "ip_subnet_mask" {
  type    = string
  default = "/24"
}

variable "ip6_subnet_mask" {
  type    = string
  default = "/64"
}

resource "random_pet" "lxc_name" {

}

resource "proxmox_lxc" "lxc" {
  hostname     = "lxc-${random_pet.lxc_name.id}"
  target_node  = var.pm_node_name
  vmid         = var.config.vmid
  ostemplate   = local.lxc_ostemplate
  cores        = 4
  memory       = 4096
  password     = var.lxc_password != "" ? var.lxc_password : random_password.lxc_password.result
  unprivileged = false
  onboot       = true
  start        = true

  rootfs {
    storage = local.lxc_storage
    size    = "32G"
  }

  network {
    name   = "eth0"
    bridge = "vmbr0"
    ip     = "${var.config.ip}${var.ip_subnet_mask}"
    ip6    = "${var.config.ip6}${var.ip6_subnet_mask}"
    gw     = var.ip_gateway
  }

  ssh_public_keys = tls_private_key.lxc_ssh_key.public_key_openssh
}


locals {
  lxc_connection = {
    host     = var.config.ip
    user     = "root"
    password = proxmox_lxc.lxc.password
  }

  pm_connection = {
    host     = var.pm_ip
    user     = var.pm_user
    password = var.pm_password
  }
}

module "patch_lxc_config" {
  source = "../remote"

  connection = local.pm_connection

  script = templatefile("${path.module}/scripts/patch_lxc_config.sh", {
    vmid = proxmox_lxc.lxc.vmid
  })

  triggers = {
    name = proxmox_lxc.lxc.hostname
  }

  depends_on = [proxmox_lxc.lxc]
}

module "configure_lxc" {
  source = "../remote"

  connection = local.lxc_connection

  script = file("${path.module}/scripts/configure_lxc.sh")

  triggers = {
    name = proxmox_lxc.lxc.hostname
  }

  depends_on = [module.patch_lxc_config]
}

output "config" {
  value = {
    name     = proxmox_lxc.lxc.hostname
    vmid     = proxmox_lxc.lxc.vmid
    ip       = var.config.ip
    ip6      = var.config.ip6
    password = proxmox_lxc.lxc.password
  }
}
