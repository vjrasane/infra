variable "hostname" {
  type = string
}

variable "user" {
  type    = string
  default = "root"
}

variable "password" {
  type = string
}

variable "command" {
  type = string
}

data "external" "ssh_cmd" {
  program = [
    "bash", "${path.module}/run_ssh_cmd.sh"
  ]

  query = {
    hostname = var.hostname,
    user     = var.user,
    password = var.password,
    command  = var.command
  }
}

output "result" {
  value = data.external.ssh_cmd.result["result"]
}

output "result_json" {
  value = data.external.ssh_cmd.result
}
