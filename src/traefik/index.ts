import path from "path";
import { Task } from "../lib/task";
import { TraefikService } from "../lib/services";

const servicesDir = path.join(__dirname, "services");

export const traefikDocker = new Task(["docker", "traefik"], async () => {
  const traefik = new TraefikService(path.join(servicesDir, "traefik.yml"));
  await traefik.deploy();
});
