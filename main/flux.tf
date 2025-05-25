resource "flux_bootstrap_git" "flux" {
  embedded_manifests = false
  path               = "kubernetes/cluster"
}

data "bitwarden_secret" "cloudflare_domain" {
  key = "cloudflare_domain"
}

resource "gpg_private_key" "sops_gpg" {
  name = "cluster0.${data.bitwarden_secret.cloudflare_domain.value}"
  email = "admin@${data.bitwarden_secret.cloudflare_domain.value}"
  rsa_bits = 4096
}

resource "kubernetes_secret" "sops_gpg" {
  metadata {
    name      = "sops-gpg"
    namespace = "flux-system"
  }

  data = {
    "sops.asc" = gpg_private_key.sops_gpg.private_key
  }

  type = "Opaque"
}

resource "local_file" "sops_public_key" {
  filename = "${path.module}/../sops.pub"
  content  = gpg_private_key.sops_gpg.public_key
}

resource "local_file" "sops_yaml" {
  filename = "${path.module}/../.sops.yaml"
  content = yamlencode({
    creation_rules = [
      {
        pgp = gpg_private_key.sops_gpg.fingerprint
        path_regex = ".*\\.ya?ml$"
        encrypted_regex = "^(auth-token)$"
      }
    ]
  })
}
