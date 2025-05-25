locals {
  namespaces = toset([
    "cloudflare"
  ])
}

resource "flux_bootstrap_git" "flux" {
  embedded_manifests = false
  path               = "kubernetes/cluster"
}

data "bitwarden_secret" "bws_access_token" {
  key = "BWS_ACCESS_TOKEN"
}

resource "kubernetes_namespace" "namespaces" {
  for_each = local.namespaces

  metadata {
    name = each.value
  }
}

resource "kubernetes_secret" "bitwarden_token" {
  for_each = local.namespaces
  metadata {
    name      = "bw-auth-token"
    namespace = each.value
  }

  data = {
    token = data.bitwarden_secret.bws_access_token.value
  }

  type = "Opaque"
}
