variable "backend_bucket" {
  description = "Backend bucket name"
  type        = string
}

terraform {
  required_providers {
    proxmox = {
      source = "telmate/proxmox"
    }

    bitwarden = {
      source  = "maxlaverse/bitwarden"
      version = ">= 0.13.6"
    }

    ansible = {
      source = "ansible/ansible"
    }

    flux = {
      source  = "fluxcd/flux"
      version = "1.5.1"
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
  }

  backend "s3" {
    region   = "eu-central-003"
    endpoint = "s3.eu-central-003.backblazeb2.com"
    bucket   = var.backend_bucket
    key      = "main.tfstate"

    skip_metadata_api_check     = true
    skip_requesting_account_id  = true
    skip_region_validation      = true
    skip_s3_checksum            = true
    skip_credentials_validation = true
  }
}
