import path from "path";
import { cloudflareSecrets } from "../lib/cloudflare-ddns";
import {
  docker_container,
  docker_volume,
  docker_compose_v2,
} from "../community/docker";
import { Service } from "../lib/services";
import { task } from "../lib/task";
import composeFile from "./traefik.yml";

const servicesDir = path.join(__dirname, "services");
const traefik = new Service("traefik", composeFile, {
  services: ["traefik"],
  secrets: cloudflareSecrets(),
});

export const traefikDocker = task(["docker", "traefik"], async () => {
  await traefik.deploy();
});

export const refreshTraefikCert = task([], async () => {
  await traefikDocker();
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
    project_src: path.dirname(traefik.serviceDir),
    pull: "always",
  });
});
