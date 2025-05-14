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

variable "lxc_password" {
  description = "Password for the LXC container"
  type        = string
  sensitive   = true
}

module "prepare_k3s_lxc" {
  source = "../ansible_playbook"

  hostname   = var.lxc_ip
  playbook   = "${path.module}/prepare_k3s_lxc.yaml"
  replayable = false
  password   = var.lxc_password
}
