import path from "path";
import { setupCloudflareDDNS } from "../lib/cloudflare-ddns";
import { Service } from "../lib/services";
import { task } from "../lib/task";
import { refreshTraefikCert, traefikDocker } from "../traefik";
import { setupResticBackup } from "../lib/restic-backup";
import { homelabResticRepo } from "../restic";
import { facts } from "module-runner";
import composeFile from "./immich.yml";

const dns = task(["dns", "immich"], async () => {
  const { dnsChanged } = await setupCloudflareDDNS(
    ["immich.karkki.org"],
    "curl ipinfo.io/ip",
  );

  if (dnsChanged) refreshTraefikCert.register();
});

const docker = task(["docker", "immich"], async () => {
  const svc = new Service("immich", composeFile);

  await svc.deploy();
});

const backup = task(["restic", "immich"], async () => {
  const { ansible_user_dir } = await facts();
  const uploadDir = path.join(ansible_user_dir, "data", "immich-upload");
  await setupResticBackup("immich", [uploadDir], await homelabResticRepo(), {
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
