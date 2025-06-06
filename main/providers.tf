
provider "bitwarden" {
  experimental {
    embedded_client = true
  }
}

resource "bitwarden_project" "automated" {
  name = "automated"
}

data "bitwarden_secret" "pm_ip" {
  key = "pm_ip"
}

data "bitwarden_secret" "pm_api_user" {
  key = "pm_api_user"
}

data "bitwarden_secret" "pm_api_token_name" {
  key = "pm_api_token_name"
}

data "bitwarden_secret" "pm_api_token_secret" {
  key = "pm_api_token_secret"
}

locals {
  pm_ip               = data.bitwarden_secret.pm_ip.value
  pm_api_user         = data.bitwarden_secret.pm_api_user.value
  pm_api_token_name   = data.bitwarden_secret.pm_api_token_name.value
  pm_api_token_secret = data.bitwarden_secret.pm_api_token_secret.value
}

provider "proxmox" {
  pm_api_url          = "http://${local.pm_ip}:8006/api2/json"
  pm_api_token_id     = "${local.pm_api_user}!${local.pm_api_token_name}"
  pm_api_token_secret = local.pm_api_token_secret
  pm_tls_insecure     = true
}

data "bitwarden_secret" "flux_github_repo" {
  key = "flux_github_repo"
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
  host        = local.kubernetes_host
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
    url = data.bitwarden_secret.flux_github_repo.value
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
