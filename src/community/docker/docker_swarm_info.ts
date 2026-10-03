import { type AnsibleModuleMeta, defineRemoteModule, type RemoteModuleSpec } from "@sensible-ts/core";

// Auto-generated from: community.docker.docker_swarm_info
// DO NOT EDIT — regenerate with codegen
const meta: AnsibleModuleMeta = {
  "fqcn": "community.docker.docker_swarm_info",
  "actionPlugin": false,
  "powershell": false,
  "rawParams": false,
  "checkMode": "full",
} as const;
const spec: RemoteModuleSpec = {
  fqcn: "community.docker.docker_swarm_info",
  collection: { "name": "community.docker", "version": "5.4.0" },
} as const;
export interface DockerSwarmInfoArgs {
  /** The version of the Docker API running on the Docker Host. */
  api_version?: string;
  /** Use a CA certificate when performing server verification by providing the path to a CA certificate file. */
  ca_path?: string;
  /** Path to the client's TLS certificate file. */
  client_cert?: string;
  /** Path to the client's TLS key file. */
  client_key?: string;
  /** Debug mode. */
  debug?: boolean;
  /** The URL or Unix socket path used to connect to the Docker API. To connect to a remote host, provide the TCP connection string. For example, V(tcp://192.0.2.23:2376). If TLS is used to encrypt the connection, the module will automatically replace C(tcp) in the connection URL with C(https). */
  docker_host?: string;
  /** Whether to list swarm nodes. */
  nodes?: boolean;
  /** A dictionary of filter values used for selecting nodes to list. */
  nodes_filters?: Record<string, unknown>;
  /** Whether to list swarm services. */
  services?: boolean;
  /** A dictionary of filter values used for selecting services to list. */
  services_filters?: Record<string, unknown>;
  /** Whether to list containers. */
  tasks?: boolean;
  /** A dictionary of filter values used for selecting tasks to list. */
  tasks_filters?: Record<string, unknown>;
  /** The maximum amount of time in seconds to wait on a response from the API. */
  timeout?: number;
  /** Secure the connection to the API by using TLS without verifying the authenticity of the Docker host server. Note that if O(validate_certs) is set to V(true) as well, it will take precedence. */
  tls?: boolean;
  /** When verifying the authenticity of the Docker Host server, provide the expected name of the server. */
  tls_hostname?: string;
  /** Whether to retrieve the swarm unlock key. */
  unlock_key?: boolean;
  /** For SSH transports, use the C(ssh) CLI tool instead of paramiko. */
  use_ssh_client?: boolean;
  /** Secure the connection to the API by using TLS and verifying the authenticity of the Docker host server. */
  validate_certs?: boolean;
  /** When set to V(true) and O(nodes), O(services), or O(tasks) is set to V(true), then the module output will contain verbose information about objects matching the full output of API method. */
  verbose_output?: boolean;
}

export interface DockerSwarmInfoReturn {
  /** Will be V(true) if the module can talk to the docker daemon. */
  can_talk_to_docker?: boolean;
  /** Will be V(true) if the module can talk to the docker daemon, and the docker daemon is in Swarm mode. */
  docker_swarm_active?: boolean;
  /** Will be V(true) if the module can talk to the docker daemon, the docker daemon is in Swarm mode, and the current node is a manager node. */
  docker_swarm_manager?: boolean;
  /** List of dict objects containing the basic information about each volume. Keys matches the C(docker node ls) output unless O(verbose_output=true). See description for O(verbose_output). */
  nodes?: Record<string, unknown> | Record<string, unknown>[];
  /** List of dict objects containing the basic information about each volume. Keys matches the C(docker service ls) output unless O(verbose_output=true). See description for O(verbose_output). */
  services?: Record<string, unknown> | Record<string, unknown>[];
  /** Facts representing the basic state of the docker Swarm cluster. */
  swarm_facts?: Record<string, unknown>;
  /** Contains the key needed to unlock the swarm. */
  swarm_unlock_key?: string;
  /** List of dict objects containing the basic information about each volume. Keys matches the C(docker service ps) output unless O(verbose_output=true). See description for O(verbose_output). */
  tasks?: Record<string, unknown> | Record<string, unknown>[];
}
export const docker_swarm_info = defineRemoteModule<DockerSwarmInfoArgs, DockerSwarmInfoReturn>(spec, meta);
