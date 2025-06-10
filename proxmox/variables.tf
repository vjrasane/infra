variable "backend_bucket" {
  description = "Backend bucket name"
  type        = string
}

variable "lxcs" {
  description = "LXC container configurations"
  type = list(object({
    vmid    = number
    ip      = string
    ip6     = string
    gateway = string
    rootfs = object({
      size    = string
      storage = string
    })
  }))
}

variable "pm_node_name" {
  description = "Proxmox node name"
  type        = string
}

variable "pm_user" {
  description = "Proxmox user"
  type        = string
}
