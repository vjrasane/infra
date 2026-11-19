import { startService } from "../lib/services";
import { homelabResticRepo, setupResticBackup } from "../restic";
import { task } from "../lib/task";
import { refreshTraefikCert } from "../traefik";
import composeFileContent from "./jellyfin.yml";
import { setupCloudflareDDNS } from "../cloudflare-ddns";
import { createFiles, dir, commonPerms as perms } from "../lib/files";
import { traefik } from "../traefik";

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
  await setupResticBackup(
    "jellyfin",
    [configDir.path],
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
