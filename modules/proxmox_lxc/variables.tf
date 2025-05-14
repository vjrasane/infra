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

variable "lxc_ip" {
  type = string
}

variable "lxc_name" {
  type    = string
  default = ""
}

variable "lxc_vmid" {
  type = number
}

variable "subnet_mask" {
  type    = string
  default = "/24"
}

variable "lxc_default_gateway" {
  type = string
}

variable "lxc_cores" {
  type    = number
  default = 1
}

variable "lxc_memory" {
  type    = number
  default = 1024
}

variable "lxc_storage_size" {
  type    = number
  default = 4
}

variable "lxc_password" {
  type      = string
  sensitive = true
}

variable "public_key_openssh" {
  type = string
}
