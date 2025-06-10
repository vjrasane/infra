provider "bitwarden" {
  experimental {
    embedded_client = true
  }
}

data "bitwarden_secret" "flux_github_token" {
  key = "flux_github_token"
}

locals {
  kubernetes_host = "https://${local.k3s_vip}:6443"
  kube_config = {
    client_certificate     = module.k3s_master.kube_config.client_certificate
    client_key             = module.k3s_master.kube_config.client_key
    cluster_ca_certificate = module.k3s_master.kube_config.cluster_ca_certificate
  }
}

provider "kubernetes" {
  host = local.kubernetes_host
  # config_path = "${path.module}/../.kube/config"
  # exec {
  # api_version = "client.authentication.k8s.io/v1beta1"
  # args = [module.k3s_master.kube_config.content]
  # command = "echo"
  # env = {
  #   KUBECONFIG = "${path.module}/../.kube/config"
  # }
  # }
  client_certificate     = local.kube_config.client_certificate
  client_key             = local.kube_config.client_key
  cluster_ca_certificate = local.kube_config.cluster_ca_certificate
}

provider "flux" {
  git = {
    url = "https://github.com/vjrasane/infra.git"
    http = {
      username = "git"
      password = data.bitwarden_secret.flux_github_token.value
    }
  }

  kubernetes = {
    host = local.kubernetes_host

    client_certificate     = local.kube_config.client_certificate
    client_key             = local.kube_config.client_key
    cluster_ca_certificate = local.kube_config.cluster_ca_certificate
  }
}
