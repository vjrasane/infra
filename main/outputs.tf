
output "kube_config_yaml" {
  value     = local.kube_config_yaml
  sensitive = true
}

output "kube_config" {
  value     = module.k3s_master.kube_config
  sensitive = true
}
