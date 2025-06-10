
provider "bitwarden" {
  experimental {
    embedded_client = true
  }
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
