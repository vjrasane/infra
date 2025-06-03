
variable "plaintext" {
  description = "The plaintext data to be encrypted"
  type        = string
  sensitive   = true
}

variable "public_key" {
  description = "The public key to use for encryption"
  type        = string
}

data "external" "sops_encrypt" {
  program = [
    "bash", "${path.module}/run_sops_encrypt.sh"
  ]

  query = {
    plaintext  = var.plaintext
    public_key = var.public_key
  }
}

output "result" {
  value = data.external.sops_encrypt.result["result"]
}

output "result_json" {
  value = data.external.sops_encrypt.result
}
