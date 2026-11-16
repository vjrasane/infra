import { readFileSync } from "fs";
import path from "path";
import { setupCloudflareDDNS } from "../lib/cloudflare-ddns";
import { setupCronjob } from "../lib/cronjob";
import { setupResticBackup } from "../lib/restic-backup";
import { setupSambaShare } from "../lib/samba";
import { Service } from "../lib/services";
import { homelabResticRepo } from "../restic";
import { task, Task } from "../lib/task";
import { refreshTraefikCert, traefikDocker } from "../traefik";
import composeFile from "./jellyfin.yml";
import { facts } from "module-runner";

// const cloudflareFirewallScript = readFileSync(
//   path.join(__dirname, "set-cloudflare-firewall.sh"),
//   "utf8",
// );
//
// const traefikCloudflareIpsScript = readFileSync(
//   path.join(__dirname, "set-traefik-cloudflare-ips.sh"),
//   "utf8",
// );

const shareDir = "/srv/shared";

const dns = task(["dns", "jellyfin"], async () => {
  const { dnsChanged } = await setupCloudflareDDNS(
    ["jellyfin.karkki.org"],
    "curl ipinfo.io/ip",
  );

  if (dnsChanged) refreshTraefikCert.register();
});

const docker = task(["docker", "jellyfin"], async () => {
  const jellyfin = new Service("jellyfin", composeFile);

  await jellyfin.deploy();
});

const backup = task(["restic", "jellyfin"], async () => {
  const { ansible_user_dir } = await facts();
  const musicDir = path.join(ansible_user_dir, "shared", "media", "music");
  await setupResticBackup(
    "jellyfin",
    [musicDir, "~/services/jellyfin-config"],
    await homelabResticRepo(),
    { hour: "3" },
  );
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
