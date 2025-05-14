
terraform {
  required_providers {
    ansible = {
      source = "ansible/ansible"
    }
  }
}

variable "hostname" {
  description = "Hostname"
  type        = string
}

variable "playbook" {
  description = "Path to the Ansible playbook"
  type        = string
}

variable "replayable" {
  description = "Whether the playbook is replayable"
  type        = bool
  default     = true
}

variable "username" {
  description = "Username"
  type        = string
  default     = "root"
}

variable "password" {
  description = "Password"
  type        = string
  sensitive   = true
}

variable "extra_vars" {
  description = "Extra variables for the Ansible playbook"
  type        = map(string)
  default     = {}
}

resource "ansible_playbook" "run_playbook" {
  name       = var.hostname
  playbook   = var.playbook
  replayable = var.replayable
  extra_vars = merge({
    ansible_user               = var.username
    ansible_password           = var.password
    ansible_python_interpreter = "/usr/bin/python3"
    ansible_ssh_extra_args     = "-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"
  }, var.extra_vars)
}
