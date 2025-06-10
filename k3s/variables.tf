variable "backend_bucket" {
  description = "Backend bucket name"
  type        = string
}

variable "k3s_vip" {
  description = "K3s VIP address"
  type        = string
}

variable "service_cidr" {
  description = "K3s service CIDR"
  type        = string
}

variable "cluster_cidr" {
  description = "K3s cluster CIDR"
  type        = string
}
