
data "terraform_remote_state" "main" {
  backend = "s3"
  config = {
    bucket   = var.backend_bucket
    key      = "main.tfstate"
    endpoint = "s3.eu-central-003.backblazeb2.com"
    region   = "eu-central-003"

    skip_metadata_api_check     = true
    skip_requesting_account_id  = true
    skip_region_validation      = true
    skip_s3_checksum            = true
    skip_credentials_validation = true
  }
}

locals {
  lxc_containers = data.terraform_remote_state.main.outputs.pm_lxc_containers
}
