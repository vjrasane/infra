terraform {
  required_providers {
    ansible = {
      source = "ansible/ansible"
    }
  }
}

variable "lxc_ip" {
  type = string
}

variable "k3s_vip" {
  type = string
}

variable "k3s_token" {
  type = string
}

variable "lxc_user" {
  type    = string
  default = "root"
}

variable "lxc_password" {
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
  source   = "../ansible_playbook"
  hostname = var.lxc_ip
  password = var.lxc_password
  replayable = false
  playbook = "${path.module}/install_k3s_server.yaml"
  extra_vars = {
    k3s_vip   = var.k3s_vip
    k3s_token = var.k3s_token
  }

  depends_on = [module.prepare_k3s_lxc]
}
