variable "lxc_config" {
  description = "LXC container configuration parameters"
  type = object({
    ip       = string
    user     = string
    password = string
  })
}

variable "flux_config" {
  description = "Flux configuration parameters"
  type = object({
    repository = string
    branch     = string
    username   = string
    path       = string
    token      = string
  })
}

locals {
  connection = {
    host     = var.lxc_config.ip
    user     = var.lxc_config.user
    password = var.lxc_config.password
  }
}

module "install_k3s" {
  source = "../remote"

  connection = local.connection

  script = templatefile("${path.module}/scripts/bootstrap_flux.sh", {
    git_owner  = var.flux_config.username,
    git_repo   = var.flux_config.repository,
    git_branch = var.flux_config.branch,
    git_path   = var.flux_config.path,
    git_token  = var.flux_config.token
  })

  triggers = {
    password  = local.connection.password
    git_repo  = var.flux_config.repository
    git_token = var.flux_config.token
  }
}
