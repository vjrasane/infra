variable "hostname" {
  type = string
}

variable "user" {
  type    = string
  default = "root"
}

variable "password" {
  type      = string
  sensitive = true
}

module "get_kube_config" {
  source = "../ssh_cmd"

  hostname = var.hostname
  user     = var.user
  password = var.password
  command  = "cat /etc/rancher/k3s/k3s.yaml"
}

output "cluster_ca_certificate" {
  value = base64decode(yamldecode(module.get_kube_config.result)["clusters"][0]["cluster"]["certificate-authority-data"])
}

output "client_certificate" {
  value = base64decode(yamldecode(module.get_kube_config.result)["users"][0]["user"]["client-certificate-data"])
}

output "client_key" {
  value = base64decode(yamldecode(module.get_kube_config.result)["users"][0]["user"]["client-key-data"])
}

locals {
  cluster_config = yamldecode(module.get_kube_config.result)["clusters"][0]["cluster"]
  user_config    = yamldecode(module.get_kube_config.result)["users"][0]["user"]
}

output "config" {
  value = {
    content                = module.get_kube_config.result
    server                 = local.cluster_config["server"]
    client_key             = base64decode(local.user_config["client-key-data"])
    client_certificate     = base64decode(local.user_config["client-certificate-data"])
    cluster_ca_certificate = base64decode(local.cluster_config["certificate-authority-data"])
  }
  sensitive = true
}
