########################
# variables
########################
variable "connection" {
  description = "SSH connection block to pass to the provisioner"
  type = object({
    host     = string
    user     = string
    password = string
  })
}

variable "script" {
  description = "Shell script to execute remotely (string)"
  type        = string
}

variable "triggers" {
  description = "Map of additional trigger values (optional)"
  type        = map(string)
  default     = {}
}

########################
# resource
########################
locals {
  script_hash = sha256(var.script)
  triggers    = merge(var.triggers, { script_hash = local.script_hash })
}

resource "null_resource" "script" {
  triggers = nonsensitive(local.triggers)

  connection {
    host     = var.connection.host
    user     = var.connection.user
    password = nonsensitive(var.connection.password)
  }

  provisioner "remote-exec" {
    inline = [nonsensitive(var.script)]
  }
}
