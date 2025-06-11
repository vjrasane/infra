provider "bitwarden" {
  experimental {
    embedded_client = true
  }
}

data "bitwarden_secret" "flux_github_token" {
  key = "flux_github_token"
}

locals {
  k3s_vip = data.terraform_remote_state.k3s.outputs.k3s.vip
  kube_config = data.terraform_remote_state.k3s.outputs.kube_config
  kubernetes_host = "https://${local.k3s_vip}:6443"
}

provider "kubernetes" {
  host = local.kubernetes_host
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
