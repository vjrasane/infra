import { type AnsibleModuleMeta, defineRemoteModule, type RemoteModuleSpec } from "module-runner";

// Auto-generated from: community.docker.docker_swarm_service
// DO NOT EDIT — regenerate with codegen
const meta: AnsibleModuleMeta = {
  "fqcn": "community.docker.docker_swarm_service",
  "actionPlugin": false,
  "powershell": false,
  "rawParams": false,
  "checkMode": "full",
} as const;
const spec: RemoteModuleSpec = {
  fqcn: "community.docker.docker_swarm_service",
  collection: { "name": "community.docker", "version": "5.4.0" },
} as const;
export interface DockerSwarmServiceArgs {
  /** The version of the Docker API running on the Docker Host. */
  api_version?: string;
  /** List arguments to be passed to the container. */
  args?: string | string[];
  /** Use a CA certificate when performing server verification by providing the path to a CA certificate file. */
  ca_path?: string;
  /** List of capabilities to add to the container. */
  cap_add?: string | string[];
  /** List of capabilities to drop from the container. */
  cap_drop?: string | string[];
  /** Path to the client's TLS certificate file. */
  client_cert?: string;
  /** Path to the client's TLS key file. */
  client_key?: string;
  /** Command to execute when the container starts. */
  command?: unknown;
  /** Controls how O(command) and O(args) are mapped to the service C(ContainerSpec). */
  command_as_args?: boolean;
  /** List of dictionaries describing the service configs. */
  configs?: Record<string, unknown> | Record<string, unknown>[];
  /** Dictionary of key value pairs. */
  container_labels?: Record<string, unknown>;
  /** Debug mode. */
  debug?: boolean;
  /** List of custom DNS servers. */
  dns?: string | string[];
  /** List of custom DNS options. */
  dns_options?: string | string[];
  /** List of custom DNS search domains. */
  dns_search?: string | string[];
  /** The URL or Unix socket path used to connect to the Docker API. To connect to a remote host, provide the TCP connection string. For example, V(tcp://192.0.2.23:2376). If TLS is used to encrypt the connection, the module will automatically replace C(tcp) in the connection URL with C(https). */
  docker_host?: string;
  /** Service endpoint mode. */
  endpoint_mode?: "vip" | "dnsrr";
  /** List or dictionary of the service environment variables. */
  env?: unknown;
  /** List of paths to files, present on the target, containing environment variables C(FOO=BAR). */
  env_files?: string | string[];
  /** Force update even if no changes require it. */
  force_update?: boolean;
  /** List of additional group names and/or IDs that the container process will run as. */
  groups?: string | string[];
  /** Configure a check that is run to determine whether or not containers for this service are "healthy". See the docs for the L(HEALTHCHECK Dockerfile instruction,https://docs.docker.com/engine/reference/builder/#healthcheck) for details on how healthchecks work. */
  healthcheck?: { interval?: string; retries?: number; start_period?: string; test?: unknown; timeout?: string };
  /** Container hostname. */
  hostname?: string;
  /** Dict of host-to-IP mappings, where each host name is a key in the dictionary. Each host name will be added to the container's /etc/hosts file. */
  hosts?: Record<string, unknown>;
  /** Service image path and tag. */
  image?: string;
  /** Use an init inside each service container to forward signals and reap processes. */
  init?: boolean;
  /** Dictionary of key value pairs. */
  labels?: Record<string, unknown>;
  /** Configures service resource limits. */
  limits?: { cpus?: number; memory?: string };
  /** Logging configuration for the service. */
  logging?: { driver?: string; options?: Record<string, unknown> };
  /** Service replication mode. */
  mode?: "replicated" | "global" | "replicated-job";
  /** List of dictionaries describing the service mounts. */
  mounts?: Record<string, unknown> | Record<string, unknown>[];
  /** Service name. */
  name: string;
  /** List of the service networks names or dictionaries. */
  networks?: unknown | unknown[];
  /** Configures service placement preferences and constraints. */
  placement?: {
    constraints?: string | string[];
    preferences?: Record<string, unknown> | Record<string, unknown>[];
    replicas_max_per_node?: number;
  };
  /** List of dictionaries describing the service published ports. */
  publish?: Record<string, unknown> | Record<string, unknown>[];
  /** Mount the containers root filesystem as read only. */
  read_only?: boolean;
  /** Number of containers instantiated in the service. Valid only if O(mode=replicated) or O(mode=replicated-job). */
  replicas?: number;
  /** Configures service resource reservations. */
  reservations?: { cpus?: number; memory?: string };
  /** If the current image digest should be resolved from registry and updated if changed. */
  resolve_image?: boolean;
  /** Configures if and how to restart containers when they exit. */
  restart_config?: {
    condition?: "none" | "on-failure" | "any";
    delay?: string;
    max_attempts?: number;
    window?: string;
  };
  /** Configures how the service should be rolled back in case of a failing update. */
  rollback_config?: {
    delay?: string;
    failure_action?: "continue" | "pause";
    max_failure_ratio?: number;
    monitor?: string;
    order?: string;
    parallelism?: number;
  };
  /** List of dictionaries describing the service secrets. */
  secrets?: Record<string, unknown> | Record<string, unknown>[];
  /** V(absent) - A service matching the specified name will be removed and have its tasks stopped. */
  state?: "present" | "absent";
  /** Time to wait before force killing a container. */
  stop_grace_period?: string;
  /** Override default signal used to stop the container. */
  stop_signal?: string;
  /** Dictionary of key, value pairs. */
  sysctls?: Record<string, unknown>;
  /** The maximum amount of time in seconds to wait on a response from the API. */
  timeout?: number;
  /** Secure the connection to the API by using TLS without verifying the authenticity of the Docker host server. Note that if O(validate_certs) is set to V(true) as well, it will take precedence. */
  tls?: boolean;
  /** When verifying the authenticity of the Docker Host server, provide the expected name of the server. */
  tls_hostname?: string;
  /** Allocate a pseudo-TTY. */
  tty?: boolean;
  /** Configures how the service should be updated. Useful for configuring rolling updates. */
  update_config?: {
    delay?: string;
    failure_action?: "continue" | "pause" | "rollback";
    max_failure_ratio?: number;
    monitor?: string;
    order?: string;
    parallelism?: number;
  };
  /** For SSH transports, use the C(ssh) CLI tool instead of paramiko. */
  use_ssh_client?: boolean;
  /** Sets the username or UID used for the specified command. */
  user?: string;
  /** Secure the connection to the API by using TLS and verifying the authenticity of the Docker host server. */
  validate_certs?: boolean;
  /** Path to the working directory. */
  working_dir?: string;
}

export interface DockerSwarmServiceReturn {
  /** List of changed service attributes if a service has been altered, [] otherwise. */
  changes?: string | string[];
  /** True if the service has been recreated (removed and created). */
  rebuilt?: boolean;
  /** Dictionary of variables representing the current state of the service. Matches the module parameters format. */
  swarm_service?: Record<string, unknown>;
}
export const docker_swarm_service = defineRemoteModule<DockerSwarmServiceArgs, DockerSwarmServiceReturn>(spec, meta);
