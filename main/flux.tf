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

resource "flux_bootstrap_git" "flux" {
  embedded_manifests = false
  path               = "kubernetes/cluster"

  depends_on = [module.k3s_master, module.k3s_server]
}
# module "flux" {
#   source = "../modules/flux"

#   lxc_config = {
#     ip       = local.k3s_master.config.ip
#     user     = "root"
#     password = local.k3s_master.config.password
#   }

#   flux_config = {
#     repository = "infra"
#     username   = "vjrasane"
#     branch     = "main"
#     path       = "kubernetes/cluster"
#     token      = data.bitwarden_secret.flux_github_token.value
#   }

#   depends_on = [module.k3s_master, kubernetes_secret.sops_gpg]
# }

resource "gpg_private_key" "sops_gpg" {
  name     = "cluster0.${data.bitwarden_secret.cloudflare_domain.value}"
  email    = "admin@${data.bitwarden_secret.cloudflare_domain.value}"
  rsa_bits = 4096
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
        pgp             = gpg_private_key.sops_gpg.fingerprint
        path_regex      = ".*\\.ya?ml$"
        encrypted_regex = "^(auth-token)$"
      }
    ]
  })
}
