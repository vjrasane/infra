variable "lxc_ip" {
  type = string
}

variable "lxc_ip6" {
  type        = string
  description = "IPv6 address of the LXC container"
}

variable "k3s_vip" {
  type = string
}

variable "k3s_token" {
  type = string
}
variable "k3s_cluster_cidr" {
  type = string
}
variable "k3s_service_cidr" {
  type = string
}

variable "lxc_user" {
  type    = string
  default = "root"
}

variable "lxc_password" {
  type = string
}

locals {
  node_ip = "${var.lxc_ip},${var.lxc_ip6}"

  connection = {
    host     = var.lxc_ip
    user     = var.lxc_user
    password = var.lxc_password
  }
}


module "install_k3s" {
  source = "../../../modules/remote"

  connection = local.connection

  script = templatefile("${path.module}/scripts/install_k3s_server.sh", {
    vip          = var.k3s_vip,
    cluster_cidr = var.k3s_cluster_cidr,
    service_cidr = var.k3s_service_cidr,
    node_ip      = local.node_ip
    token        = var.k3s_token
  })

  triggers = {
    password = local.connection.password
    vip      = var.k3s_vip
  }
}
