import path from "path";
import { startService } from "../lib/services";
import { homelabResticRepo, setupResticBackup } from "../restic";
import { task } from "../lib/task";
import { refreshTraefikCert } from "../traefik";
import composeFileContent from "./jellyfin.yml";
import { facts } from "module-runner";
import { setupCloudflareDDNS } from "../cloudflare-ddns";
import { createFiles, dir, selfGroup, selfOwner } from "../lib/files";
import { traefik } from "../traefik";

// const cloudflareFirewallScript = readFileSync(
//   path.join(__dirname, "set-cloudflare-firewall.sh"),
//   "utf8",
// );
//
// const traefikCloudflareIpsScript = readFileSync(
//   path.join(__dirname, "set-traefik-cloudflare-ips.sh"),
//   "utf8",
// );
//
const perms = {
  become: true,
  owner: selfOwner,
  group: selfGroup,
  mode: "0700",
};

const serviceDir = dir("/opt/jellyfin", perms);
const configDir = dir("/var/lib/jellyfin/config", perms);

const composeFile = serviceDir.file("compose.yaml", composeFileContent);

const dns = task(["jellyfin"], async () => {
  const { dnsChanged } = await setupCloudflareDDNS("jellyfin.karkki.org");

  if (dnsChanged) refreshTraefikCert.register();
});

const directories = task(["jellyfin"], async () => {
  await createFiles(serviceDir, configDir);
});

const docker = task(["docker", "jellyfin"], async () => {
  await directories();
  await composeFile.create();
  await startService("jellyfin", composeFile.dirPath, {
    networks: ["traefik"],
  });
});

const backup = task(["restic", "jellyfin"], async () => {
  const { ansible_user_dir } = await facts();
  const musicDir = path.join(ansible_user_dir, "shared", "media", "music");
  await setupResticBackup(
    "jellyfin",
    [musicDir, configDir.path],
    await homelabResticRepo(),
    { hour: "3" },
  );
});

export const jellyfin = async () => {
  await dns();
  await traefik();
  await directories();
  await docker();
  await backup();
};
