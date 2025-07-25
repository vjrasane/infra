variable "backend_bucket" {
  description = "Backend bucket name"
  type        = string
}

terraform {
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "3.5.0"
    }

    bitwarden = {
      source  = "maxlaverse/bitwarden"
      version = ">= 0.13.6"
    }

    dns = {
      source  = "hashicorp/dns"
      version = "3.4.3"
    }
  }

  encryption {
    key_provider "pbkdf2" "passphrase" {
      # passphrase = var.state_passphrase
      passphrase = "<default>"
    }

    method "aes_gcm" "encrypt" {
      keys = key_provider.pbkdf2.passphrase
    }

    state {
      enforced = true
      method   = method.aes_gcm.encrypt
    }

    plan {
      enforced = true
      method   = method.aes_gcm.encrypt
    }

    remote_state_data_sources {
      default {
        method = method.aes_gcm.encrypt
      }
    }
  }

  backend "s3" {
    region   = "eu-central-003"
    endpoint = "s3.eu-central-003.backblazeb2.com"
    bucket   = var.backend_bucket
    key      = "dns.tfstate"

    skip_metadata_api_check     = true
    skip_requesting_account_id  = true
    skip_region_validation      = true
    skip_s3_checksum            = true
    skip_credentials_validation = true
  }
}

variable "docker_host" {
  description = "The Docker host to connect to"
  type        = string
  sensitive   = true
}

variable "ca_material" {
  description = "The CA material for the Docker host"
  type        = string
  sensitive   = true
}

variable "cert_material" {
  description = "The certificate material for the Docker host"
  type        = string
  sensitive   = true
}

variable "key_material" {
  description = "The key material for the Docker host"
  type        = string
  sensitive   = true
}

provider "docker" {
  host = var.docker_host

  ca_material   = var.ca_material
  cert_material = var.cert_material
  key_material  = var.key_material
}

provider "bitwarden" {
  experimental {
    embedded_client = true
  }
}

# variable "rpi_ip" {
#   description = "The IP address of the Raspberry Pi"
#   type        = string
#   sensitive   = true
# }

data "bitwarden_secret" "bind9_ip" {
  key = "bind9_ip"
}

data "bitwarden_secret" "tsig_key" {
  key = "tsig_key"
  # description = "The TSIG key for the DNS server"
  # type        = string
  # sensitive   = true
}

locals {
  tsig_key_matches = regex("secret \"(.*)\";", data.bitwarden_secret.tsig_key.value)
  tsig_key = local.tsig_key_matches[0]
}

provider "dns" {
  update {
    server        = data.bitwarden_secret.bind9_ip.value
    key_name      = "tsig-key."
    key_algorithm = "hmac-sha256"
    # key_secret    = var.tsig_key
    key_secret = local.tsig_key
  }
}

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
  k3s_vip = data.terraform_remote_state.main.outputs.k3s.vip
}
