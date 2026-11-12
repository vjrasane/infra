import path from "path";

import { task } from "./lib/task";
import {
  docker_container,
  docker_volume,
  docker_compose_v2,
} from "./community/docker";
import { cloudflareSecrets } from "./lib/cloudflare-ddns";
import { Service } from "./lib/services";

const treafikContainerName = "traefik";

class TraefikService extends Service {
  constructor(sourceComposeFilePath: string) {
    super(treafikContainerName, sourceComposeFilePath, {
      services: [treafikContainerName],
      secrets: cloudflareSecrets(),
    });
  }
}

const servicesDir = path.join(__dirname, "services");
const traefik = new TraefikService(path.join(servicesDir, "traefik.yml"));

export const traefikDocker = task(["docker", "traefik"], async () => {
  await traefik.deploy();
});

export const refreshTraefikCert = task([], async () => {
  await traefikDocker();
  await docker_container("Remove traefik container after DNS update", {
    name: treafikContainerName,
    state: "absent",
  });

  await docker_volume("Remove traefik letsencrypt volume", {
    volume_name: treafikContainerName + "-letsencrypt",
    state: "absent",
  });

  await docker_compose_v2("Recreate traefik after DNS update", {
    services: treafikContainerName,
    project_src: path.dirname(traefik.serviceDir),
    pull: "always",
  });
});
