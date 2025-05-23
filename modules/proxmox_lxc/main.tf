
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

# resource "random_password" "lxc_password" {
#   length  = 16
#   special = true
# }

resource "random_pet" "lxc_name" {
  keepers = {
    lxc_name = var.lxc_name
  }
}

resource "proxmox_lxc" "lxc" {
  hostname     = var.lxc_name == "" ? "lxc-${random_pet.lxc_name.id}" : var.lxc_name
  target_node  = var.pm_node_name
  vmid         = var.lxc_vmid
  ostemplate   = local.lxc_ostemplate
  cores        = var.lxc_cores
  memory       = var.lxc_memory
  password     = var.lxc_password
  unprivileged = false
  onboot       = true
  start        = true

  rootfs {
    storage = local.lxc_storage
    size    = "${var.lxc_storage_size}G"
  }

  features {
  }

  network {
    name   = "eth0"
    bridge = "vmbr0"
    ip     = "${var.lxc_ip}${var.subnet_mask}"
    gw     = var.lxc_default_gateway
  }

  ssh_public_keys = var.public_key_openssh

  connection {
    host     = var.pm_ip
    user     = var.pm_user
    password = var.pm_password
  }

  provisioner "remote-exec" {
    inline = [
      "rm -f /tmp/patch_lxc_config.sh || true",
    ]
  }

  provisioner "file" {
    source      = "${path.module}/scripts/patch_lxc_config.sh"
    destination = "/tmp/patch_lxc_config.sh"
  }

  provisioner "remote-exec" {
    inline = [
      "chmod +x /tmp/patch_lxc_config.sh",
      "/tmp/patch_lxc_config.sh ${self.vmid}",
      "rm -f /tmp/patch_lxc_config.sh",
    ]
  }
}

module "configure_lxc" {
  source = "../ansible_playbook"

  hostname = var.lxc_ip
  playbook = "${path.module}/configure_lxc.yaml"
  password = var.lxc_password

  depends_on = [proxmox_lxc.lxc]
}

output "lxc_password" {
  value     = var.lxc_password
  sensitive = true
}

output "lxc_name" {
  value = proxmox_lxc.lxc.hostname
}

output "lxc_ip" {
  value = var.lxc_ip
}

output "lxc_vmid" {
  value = proxmox_lxc.lxc.vmid
}
