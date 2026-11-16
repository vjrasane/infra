import {
  docker_container,
  docker_volume,
  docker_compose_v2,
} from "../community/docker";
import { task } from "../lib/task";
import composeFileContent from "./traefik.yml";
import { cloudflareSecrets } from "../cloudflare-ddns";
import { dir, selfGroup, selfOwner } from "../lib/files";
import { toEnvFile } from "../lib/utils";
import { startService } from "../lib/services";

const perms = {
  become: true,
  owner: selfOwner,
  group: selfGroup,
  mode: "0700",
};

const serviceDir = dir("/opt/traefik", perms);

const composeFile = serviceDir.file("compose.yaml", composeFileContent, perms);
const secretsFile = serviceDir.file(
  ".env",
  cloudflareSecrets().then(toEnvFile),
  { ...perms, mode: "0600" },
);

export const traefik = task(["docker", "traefik"], async () => {
  await composeFile.create();
  await secretsFile.create();
  await startService("traefik", composeFile.dirPath, {
    networks: ["traefik"],
  });
});

export const refreshTraefikCert = task([], async () => {
  await docker_container("Remove traefik container after DNS update", {
    name: "traefik",
    state: "absent",
  });

  await docker_volume("Remove traefik letsencrypt volume", {
    volume_name: "traefik-letsencrypt",
    state: "absent",
  });

  await docker_compose_v2("Recreate traefik after DNS update", {
    services: "traefik",
    project_src: serviceDir.path,
    pull: "missing",
  });
});
