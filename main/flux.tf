
resource "flux_bootstrap_git" "flux" {
  embedded_manifests = false
  path               = "kubernetes"
}
