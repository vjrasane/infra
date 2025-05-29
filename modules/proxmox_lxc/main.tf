
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
  type = string
  sensitive = true
  default = ""
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

  # connection {
  #   host     = var.pm_ip
  #   user     = var.pm_user
  #   password = var.pm_password
  # }

  # provisioner "remote-exec" {
  #   inline = [
  #     "rm -f /tmp/patch_lxc_config.sh || true",
  #   ]
  # }

  # provisioner "file" {
  #   source      = "${path.module}/patch_lxc_config.sh"
  #   destination = "/tmp/patch_lxc_config.sh"
  # }

  # provisioner "remote-exec" {
  #   inline = [
  #     "chmod +x /tmp/patch_lxc_config.sh",
  #     "/tmp/patch_lxc_config.sh ${self.vmid}",
  #     "rm -f /tmp/patch_lxc_config.sh",
  #   ]
  # }
  # provisioner "remote-exec" {
  #   inline = [
  #     "rm -f /tmp/configure_lxc.sh || true",
  #   ]

  #   connection {
  #     host        = var.config.ip
  #     user        = "root"
  #     private_key = tls_private_key.lxc_ssh_key.private_key_pem
  #   }
  # }

  # provisioner "file" {
  #   source      = "${path.module}/configure_lxc.sh"
  #   destination = "/tmp/configure_lxc.sh"

  #   connection {
  #     host        = var.config.ip
  #     user        = "root"
  #     private_key = tls_private_key.lxc_ssh_key.private_key_pem
  #   }
  # }

  # provisioner "remote-exec" {
  #   inline = [
  #     "chmod +x /tmp/configure_lxc.sh",
  #     "/tmp/configure_lxc.sh",
  #     "rm -f /tmp/configure_lxc.sh",
  #   ]

  #   connection {
  #     host        = var.config.ip
  #     user        = "root"
  #     private_key = tls_private_key.lxc_ssh_key.private_key_pem
  #   }
  # }
}

# module "configure_lxc" {
#   source = "../ansible_playbook"

#   hostname = var.config.ip
#   playbook = "${path.module}/configure_lxc.yaml"
#   password = proxmox_lxc.lxc.password

#   replayable = false

#   depends_on = [proxmox_lxc.lxc]
# }

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
   name     = proxmox_lxc.lxc.hostname
  }

  depends_on = [proxmox_lxc.lxc]
}

module "configure_lxc" {
  source = "../remote"

  connection = local.lxc_connection

  script = file("${path.module}/scripts/configure_lxc.sh")

  triggers = {
    name     = proxmox_lxc.lxc.hostname
  }

  depends_on = [module.patch_lxc_config]
}

# module "set_timezone" {
#   source = "../remote"

#   connection = local.lxc_connection

#   script = <<-EOT
#     current_tz="$(timedatectl show --property=Timezone --value)"
#     if [[ "$current_tz" != "$TIMEZONE" ]]; then
#         timedatectl set-timezone "$TIMEZONE"
#     fi
#   EOT

#   triggers = {
#     password = local.lxc_connection.password
#   }

#   depends_on = [module.patch_lxc_config]
# }

# module "install_packages" {
#   source = "../remote"

#   connection = local.lxc_connection

#   script = <<-EOT
#     apt-get update -y >/dev/null
#     DEBIAN_FRONTEND=noninteractive apt-get install -y \
#         curl jq \
#         nfs-common open-iscsi cryptsetup
#   EOT

#   triggers = {
#     password = local.lxc_connection.password
#   }

#   depends_on = [module.patch_lxc_config]
# }

# module "sysctl" {
#   source = "../remote"

#   connection = local.lxc_connection

#   script = <<-EOT
#     SYSCTL_FILE="/etc/sysctl.d/99-forwarding.conf"
#     cat >"$SYSCTL_FILE" <<'EOF'
#     net.ipv4.ip_forward = 1
#     net.ipv6.conf.all.forwarding = 1
#     net.ipv6.conf.all.accept_ra = 2
#     EOF
#     sysctl --system # apply now
#   EOT

#   triggers = {
#     password = local.lxc_connection.password
#   }

#   depends_on = [module.patch_lxc_config]
# }

# module "conf-kmsg" {
#   source = "../remote"

#   connection = local.lxc_connection

#   script = <<-EOT
#     KMSG_SCRIPT="/usr/local/bin/conf-kmsg.sh"
#     KMSG_UNIT="/etc/systemd/system/conf-kmsg.service"

#     install -m 0755 -o root -g root /dev/stdin "$KMSG_SCRIPT" <<'EOF'
#     #!/bin/sh -e
#     if [ ! -e /dev/kmsg ]; then
#         ln -s /dev/console /dev/kmsg
#     fi
#     mount --make-rshared /
#     EOF

#     install -m 0644 -o root -g root /dev/stdin "$KMSG_UNIT" <<'EOF'
#     [Unit]
#     Description=Make sure /dev/kmsg exists

#     [Service]
#     Type=simple
#     RemainAfterExit=yes
#     ExecStart=/usr/local/bin/conf-kmsg.sh
#     TimeoutStartSec=0

#     [Install]
#     WantedBy=default.target
#     EOF

#     systemctl daemon-reload
#     systemctl enable --now conf-kmsg.service
#   EOT

#   triggers = {
#     password = local.lxc_connection.password
#   }

#   depends_on = [module.patch_lxc_config]
# }

# module "iscsid" {
#   source = "../remote"

#   connection = local.lxc_connection

#   script = <<-EOT
#     systemctl enable --now iscsid.service
#   EOT

#   triggers = {
#     password = local.lxc_connection.password
#   }

#   depends_on = [module.patch_lxc_config, module.install_packages]
# }

# module "reboot" {
#   source = "../remote"

#   connection = local.lxc_connection

#   script = <<-EOT
#     (sleep 1 && reboot) &
#   EOT

#   triggers = {
#     password = local.lxc_connection.password
#   }

#   depends_on = [
#     module.patch_lxc_config,
#     module.conf-kmsg,
#     module.iscsid,
#     module.install_packages,
#     module.set_timezone
#   ]
# }

output "config" {
  value = {
    name     = proxmox_lxc.lxc.hostname
    vmid     = proxmox_lxc.lxc.vmid
    ip       = var.config.ip
    ip6      = var.config.ip6
    password = proxmox_lxc.lxc.password
  }
}
