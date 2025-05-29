
resource "kubernetes_secret" "sops_gpg" {
  metadata {
    name      = "sops-gpg"
    namespace = "flux-system"
  }

  data = {
    "sops.asc" = gpg_private_key.sops_gpg.private_key
  }

  type = "Opaque"

  depends_on = [local.k3s_master, module.k3s_server, flux_bootstrap_git.flux]
}

resource "flux_bootstrap_git" "flux" {
  embedded_manifests = false
  path               = "kubernetes/cluster"

  depends_on = [module.k3s_master, module.k3s_server]
}

resource "gpg_private_key" "sops_gpg" {
  name     = "cluster0.${data.bitwarden_secret.cloudflare_domain.value}"
  email    = "admin@${data.bitwarden_secret.cloudflare_domain.value}"
  rsa_bits = 4096
}

resource "local_file" "sops_public_key" {
  filename = "${path.module}/../sops.pub"
  content  = gpg_private_key.sops_gpg.public_key
}

data "bitwarden_secret" "bw_auth_token" {
  key = "BW_AUTH_TOKEN"
}

resource "local_file" "sops_yaml" {
  filename = "${path.module}/../.sops.yaml"
  content = yamlencode({
    creation_rules = [
      {
        pgp             = gpg_private_key.sops_gpg.fingerprint
        path_regex      = ".*\\.ya?ml$"
        encrypted_regex = "^(auth-token)$"
      }
    ]
  })
}
