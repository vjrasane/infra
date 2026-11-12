import path from "path";
import { setupCloudflareDDNS } from "../lib/cloudflare-ddns";
import { Service } from "../lib/services";
import { task } from "../lib/task";
import { refreshTraefikCert, traefikDocker } from "../traefik";
import { setupResticBackup } from "../lib/restic-backup";
import { homelabResticRepo } from "../restic";

const dns = task(["dns", "immich"], async () => {
  const { dnsChanged } = await setupCloudflareDDNS(
    ["immich.karkki.org"],
    "curl ipinfo.io/ip",
  );

  if (dnsChanged) refreshTraefikCert.register();
});

const docker = task(["docker", "immich"], async () => {
  const jellyfin = new Service(
    "immich",
    path.join(servicesDir, "jellyfin.yml"),
  );

  await jellyfin.deploy();
});

const backup = task(["restic", "immich"], async () => {
  await setupResticBackup("immich", [], await homelabResticRepo(), {
    hour: "4",
  });
});

export default async () => {
  await Promise.all([
    //--------------
    dns(),
    traefikDocker(),
    docker(),
    backup(),
  ]);
};
