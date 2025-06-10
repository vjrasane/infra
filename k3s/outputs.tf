
output "kube_config_yaml" {
  value     = local.kube_config_yaml
  sensitive = true
}

output "kube_config" {
  value     = module.k3s_master.kube_config
  sensitive = true
}

output "k3s" {
  value = {
    vip          = var.k3s_vip
    fqdn         = local.k3s_fqdn
    cluster_cidr = var.cluster_cidr
    service_cidr = var.service_cidr
  }
}
