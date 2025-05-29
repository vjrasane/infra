terraform {
  required_providers {
    ansible = {
      source = "ansible/ansible"
    }
  }
}

variable "lxc_config" {
  description = "LXC container configuration parameters"
  type = object({
    ip       = string
    ip6      = string
    user     = string
    password = string
  })
}

variable "k3s_config" {
  description = "k3s configuration parameters"
  type = object({
    vip          = string
    fqdn         = string
    cluster_cidr = string
    service_cidr = string
  })
}

locals {
  node_ip = "${var.lxc_config.ip},${var.lxc_config.ip6}"
  connection = {
    host     = var.lxc_config.ip
    user     = var.lxc_config.user
    password = var.lxc_config.password
  }
}


module "install_k3s" {
  source = "../remote"

  connection = local.connection

  script = templatefile("${path.module}/scripts/install_k3s_master.sh", {
    vip          = var.k3s_config.vip,
    fqdn         = var.k3s_config.fqdn,
    cluster_cidr = var.k3s_config.cluster_cidr,
    service_cidr = var.k3s_config.service_cidr,
    node_ip      = local.node_ip
  })

  triggers = {
    password = local.connection.password
    vip      = var.k3s_config.vip
  }
}

resource "null_resource" "kube_vip" {
  triggers = {
    password = local.connection.password
    k3s_vip  = var.k3s_config.vip
  }

  connection {
    host     = local.connection.host
    user     = local.connection.user
    password = local.connection.password
  }

  provisioner "file" {
    content = templatefile("${path.module}/templates/kube-vip.yaml.tftpl", {
      k3s_vip = var.k3s_config.vip,
    })
    destination = "/var/lib/rancher/k3s/server/manifests/kube-vip.yaml"
  }

  depends_on = [module.install_k3s]
}

module "k3s_token" {
  source = "../ssh_cmd"

  hostname = var.lxc_config.ip
  user     = var.lxc_config.user
  password = var.lxc_config.password
  command  = "cat /var/lib/rancher/k3s/server/token"

  depends_on = [module.install_k3s]
}

module "kube_config" {
  source = "../kube_config"

  hostname = var.lxc_config.ip
  user     = var.lxc_config.user
  password = var.lxc_config.password

  depends_on = [module.install_k3s]
}

output "k3s_token" {
  value     = module.k3s_token.result
  sensitive = true
}

output "kube_config" {
  value     = module.kube_config.config
  sensitive = true
}

output "ip" {
  value = var.lxc_config.ip
}

output "vip" {
  value = var.k3s_config.vip
}
