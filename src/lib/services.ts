import { file, copy } from "@sensible-ts/core/builtin";
import { toEnvFile } from "./utils";
import {
  docker_compose_v2,
  docker_container,
  docker_volume,
} from "../community/docker";

const secretsFile = "~/.env";
const servicesDir = "~/services";

export const setupServices = async (
  composeFilePath: string,
  services: string[],
  secrets: Record<string, string>,
) => {
  await file("Create services directory", {
    path: servicesDir,
    state: "directory",
  });

  await copy("Copy secrets", {
    content: toEnvFile(secrets),
    dest: "~/.env",
    mode: "0600",
  });

  await file("Symlink secrets to services dir", {
    src: secretsFile,
    path: servicesDir + "/.env",
    state: "link",
    force: true,
  });

  await copy("Copy docker compose file", {
    src: composeFilePath,
    dest: "~/services/docker-compose.yml",
  });

  await docker_compose_v2("Start services", {
    services,
    project_src: servicesDir,
    pull: "always",
  });
};

export const refreshTraefikCert = async (
  container = "traefik",
  volume = "traefik-letsencrypt",
) => {
  await docker_container("Remove traefik container after DNS update", {
    name: container,
    state: "absent",
  });

  await docker_volume("Remove traefik letsencrypt volume", {
    volume_name: volume,
    state: "absent",
  });

  await docker_compose_v2("Recreate traefik after DNS update", {
    services: [container],
    project_src: servicesDir,
    pull: "always",
  });
};
