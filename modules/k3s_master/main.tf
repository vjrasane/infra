terraform {
  required_providers {
    ansible = {
      source = "ansible/ansible"
    }
  }
}

variable "lxc_ip" {
  description = "IP address of the LXC container"
  type        = string
}

variable "lxc_user" {
  description = "Username for the LXC container"
  type        = string
  default     = "root"
}

variable "lxc_password" {
  description = "Password for the LXC container"
  type        = string
  sensitive   = true
}

variable "k3s_vip" {
  type = string
}

variable "k3s_metallb_ip_pool" {
  type = string
}

module "prepare_k3s_lxc" {
  source = "../ansible_playbook"

  hostname   = var.lxc_ip
  playbook   = "${path.module}/../k3s_lxc/prepare_k3s_lxc.yaml"
  replayable = false
  password   = var.lxc_password
}

module "install_k3s" {
  source = "../ansible_playbook"

  hostname   = var.lxc_ip
  playbook   = "${path.module}/install_k3s_master.yaml"
  replayable = false
  password   = var.lxc_password

  extra_vars = {
    k3s_vip             = var.k3s_vip
    k3s_metallb_ip_pool = var.k3s_metallb_ip_pool
  }

  depends_on = [module.prepare_k3s_lxc]
}

module "k3s_token" {
  source = "../ssh_cmd"

  hostname = var.lxc_ip
  user     = var.lxc_user
  password = var.lxc_password
  command  = "cat /var/lib/rancher/k3s/server/token"

  depends_on = [module.install_k3s]
}

module "kube_config" {
  source = "../kube_config"

  hostname = var.lxc_ip
  user     = var.lxc_user
  password = var.lxc_password

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

output "k3s_master_ip" {
  value = var.lxc_ip
}
