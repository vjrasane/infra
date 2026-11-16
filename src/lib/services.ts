import { docker_compose_v2, docker_network } from "../community/docker";

interface ServiceOpts {
  services?: string[];
  networks?: string[];
}

export const startService = async (
  name: string,
  path: string,
  opts: ServiceOpts = {},
) => {
  const { services, networks = [] } = opts;
  await Promise.all(
    networks.map((network) =>
      docker_network(`Create ${network} network for service ${name}`, {
        name: network,
      }),
    ),
  );

  await docker_compose_v2("Start " + name, {
    project_name: name,
    project_src: path,
    services: services ?? [name],
    pull: "missing",
  });
};
