
resource "dns_a_record_set" "ns" {
  zone      = "${local.home_domain}."
  name      = "ns"
  addresses = [var.rpi_ip]
  ttl       = 3600

  depends_on = [docker_container.bind9]
}
