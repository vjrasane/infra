import { task } from "../lib/task";
import { refreshTraefikCert, traefik } from "../traefik";
import { homelabResticRepo, setupResticBackup } from "../restic";
import { setupCloudflareDDNS } from "../cloudflare-ddns";
import { createFiles, dir, selfGroup, selfOwner } from "../lib/files";
import { startService } from "../lib/services";
import composeFileContent from "./immich.yml";

const perms = {
  become: true,
  owner: selfOwner,
  group: selfGroup,
  mode: "0700",
};

const serviceDir = dir("/opt/immich", perms);
const configDir = dir("/var/lib/immich/config", perms);
const dbDir = dir("/var/lib/immich/db", perms);
const uploadDir = dir("/mnt/data/immich/upload", perms);

const composeFile = serviceDir.file("compose.yaml", composeFileContent);

const dns = task(["immich"], async () => {
  const { dnsChanged } = await setupCloudflareDDNS(
    ["immich.karkki.org"],
    "curl ipinfo.io/ip",
  );

  if (dnsChanged) refreshTraefikCert.register();
});

const directories = task(["immich"], async () => {
  await createFiles(configDir, dbDir, uploadDir);
});

const docker = task(["docker", "immich"], async () => {
  await directories();
  await composeFile.create();
  await startService("immich", composeFile.dirPath, {
    networks: ["traefik"],
    services: [
      "immich",
      "immich-machine-learning",
      "immich-redis",
      "immich-database",
    ],
  });
});

const backup = task(["restic", "immich"], async () => {
  await setupResticBackup(
    "immich",
    [uploadDir.path, configDir.path],
    await homelabResticRepo(),
    { hour: "4" },
  );
});

export const immich = async () => {
  await dns();
  await traefik();
  await directories();
  await docker();
  await backup();
};
