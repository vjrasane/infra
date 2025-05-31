
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

  depends_on = [local.k3s_master, module.k3s_server, flux_bootstrap_git.flux]
}

resource "flux_bootstrap_git" "flux" {
  embedded_manifests = false
  path               = "kubernetes/cluster"

  depends_on = [module.k3s_master, module.k3s_server]
}

data "bitwarden_secret" "bw_auth_token" {
  key = "BWS_ACCESS_TOKEN"
}

resource "local_file" "sops_yaml" {
  filename = "${path.module}/../.sops.yaml"
  content = yamlencode({
    creation_rules = [
      {
        age             = age_secret_key.sops_age_key.public_key
        path_regex      = ".*\\.ya?ml$"
        encrypted_regex = "^(auth-token)$"
      }
    ]
  })

  depends_on = [ age_secret_key.sops_age_key ]
}

resource "sops_file" "bw_auth_token" {
  encryption_type = "age"
  content = templatefile("${path.module}/templates/bw-auth-token.yaml.tftpl", {
    auth_token = data.bitwarden_secret.bw_auth_token.value
  })
  filename = "${path.module}/../kubernetes/secrets/bw-auth-token.yaml"
  age = {
    key = age_secret_key.sops_age_key.public_key
  }

  depends_on = [ local_file.sops_yaml, age_secret_key.sops_age_key ]
}
