
resource "age_secret_key" "sops_age_key" {

}

resource "kubernetes_secret" "sops_age_key" {
  metadata {
    name      = "sops-age-key"
    namespace = "flux-system"
  }

  data = {
    "sops.agekey" = age_secret_key.sops_age_key.secret_key
  }

  type = "Opaque"

  depends_on = [flux_bootstrap_git.flux]
}

resource "flux_bootstrap_git" "flux" {
  embedded_manifests = false
  path               = "kubernetes/cluster"
}

data "bitwarden_secret" "bw_auth_token" {
  key = "BWS_ACCESS_TOKEN"
}

module "sops_encrypt" {
  source = "./modules/sops_encrypt"

  plaintext = templatefile("${path.module}/templates/bw-auth-token.yaml.tftpl", {
    auth_token = data.bitwarden_secret.bw_auth_token.value
  })

  public_key = age_secret_key.sops_age_key.public_key

  depends_on = [age_secret_key.sops_age_key]
}

resource "local_file" "bw_auth_token" {
  filename = "${path.module}/../kubernetes/secrets/bw-auth-token.yaml"
  content  = module.sops_encrypt.result

  depends_on = [module.sops_encrypt, age_secret_key.sops_age_key]
}
