variable "oci_profile" {
  description = "OCI config file profile name"
  type        = string
  default     = "DEFAULT"
}

variable "compartment_ocid" {
  description = "OCID of the compartment for resources"
  type        = string
}
