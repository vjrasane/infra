data "bitwarden_secret" "cloudflare_domain" {
  key = "cloudflare_domain"
}

data "bitwarden_secret" "rpi_ip" {
  key = "rpi_ip"
}

locals {
  home_domain = "home.${data.bitwarden_secret.cloudflare_domain.value}"
}

resource "dns_a_record_set" "rpi" {
  zone      = "${local.home_domain}."
  name      = "rpi"
  addresses = [data.bitwarden_secret.rpi_ip.value]
  ttl       = 3600

  # depends_on = [docker_container.bind9]
}

# resource "dns_cname_record" "nginx" {
#   zone  = "${local.home_domain}."
#   name  = "nginx"
#   cname = "${dns_a_record_set.rpi.name}.${local.home_domain}."
#   ttl   = 3600

#   # depends_on = [docker_container.bind9]
# }

# data "bitwarden_secret" "pm_ip" {
#   key = "pm_ip"
# }

# resource "dns_a_record_set" "proxmox" {
#   zone      = "${local.home_domain}."
#   name      = "proxmox"
#   addresses = [data.bitwarden_secret.pm_ip.value]
#   ttl       = 3600

#   depends_on = [docker_container.bind9]
# }

# resource "dns_a_record_set" "lxc" {
#   for_each  = local.lxc_containers
#   zone      = "${local.home_domain}."
#   name      = each.key
#   addresses = [each.value]
#   ttl       = 300

#   depends_on = [docker_container.bind9]
# }

# resource "dns_a_record_set" "k3s" {
#   zone      = "${local.home_domain}."
#   name      = "k3s"
#   addresses = [local.k3s_vip]
#   ttl       = 300

#   depends_on = [docker_container.bind9]
# }

# resource "dns_a_record_set" "webserver" {
#   zone      = "${local.home_domain}."
#   name      = "webserver"
#   addresses = ["192.168.1.220"]
#   ttl       = 300

#   depends_on = [docker_container.bind9]
# }
