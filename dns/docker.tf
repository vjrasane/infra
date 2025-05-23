
resource "docker_image" "bind9" {
  name = "ubuntu/bind9:latest"
}

data "bitwarden_secret" "rpi_user" {
  key = "rpi_user"
}

data "bitwarden_secret" "rpi_password" {
  key = "rpi_password"
}

data "bitwarden_secret" "bind9_acl_ips" {
  key = "bind9_acl_ips"
}

data "bitwarden_secret" "cloudflare_domain" {
  key = "cloudflare_domain"
}

locals {
  home_domain = "home.${data.bitwarden_secret.cloudflare_domain.value}"
}

resource "docker_volume" "bind9" {
  name = "bind9"

  connection {
    host     = var.rpi_ip
    user     = data.bitwarden_secret.rpi_user.value
    password = data.bitwarden_secret.rpi_password.value
  }

  provisioner "file" {
    content = templatefile("${path.module}/templates/named.conf.tftpl", {
      acl_ips  = data.bitwarden_secret.bind9_acl_ips.value
      tsig_key = var.tsig_key
      domain   = local.home_domain
    })
    destination = "/tmp/named.conf"
  }

  provisioner "file" {
    content = templatefile("${path.module}/templates/zone.conf.tftpl", {
      domain = local.home_domain
      email  = "admin@${data.bitwarden_secret.cloudflare_domain.value}"
      nameserver_ip = var.rpi_ip
    })
    destination = "/tmp/zone.conf"
  }

  provisioner "remote-exec" {
    inline = [
      "sudo mv /tmp/named.conf ${self.mountpoint}/named.conf",
      "sudo mv /tmp/zone.conf ${self.mountpoint}/zone.conf",
    ]
  }
}

data "bitwarden_secret" "timezone" {
  key = "timezone"
}

resource "docker_container" "bind9" {
  name  = "bind9"
  image = docker_image.bind9.image_id

  volumes {
    host_path      = docker_volume.bind9.mountpoint
    container_path = "/etc/bind"
  }

  network_mode = "host"

  restart = "unless-stopped"

  env = [
    "BIND9_USER=root",
    "TZ=${data.bitwarden_secret.timezone.value}"
  ]
}
