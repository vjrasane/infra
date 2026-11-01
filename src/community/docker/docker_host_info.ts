import { type AnsibleModuleMeta, defineRemoteModule, type RemoteModuleSpec } from "module-runner";

// Auto-generated from: community.docker.docker_host_info
// DO NOT EDIT — regenerate with codegen
const meta: AnsibleModuleMeta = {
  "fqcn": "community.docker.docker_host_info",
  "actionPlugin": false,
  "powershell": false,
  "rawParams": false,
  "checkMode": "full",
} as const;
const spec: RemoteModuleSpec = {
  fqcn: "community.docker.docker_host_info",
  collection: { "name": "community.docker", "version": "5.4.0" },
} as const;
export interface DockerHostInfoArgs {
  /** The version of the Docker API running on the Docker Host. */
  api_version?: string;
  /** Use a CA certificate when performing server verification by providing the path to a CA certificate file. */
  ca_path?: string;
  /** Path to the client's TLS certificate file. */
  client_cert?: string;
  /** Path to the client's TLS key file. */
  client_key?: string;
  /** Whether to list containers. */
  containers?: boolean;
  /** By default, only running containers are returned. */
  containers_all?: boolean;
  /** A dictionary of filter values used for selecting containers to list. */
  containers_filters?: Record<string, unknown>;
  /** Debug mode */
  debug?: boolean;
  /** Summary information on used disk space by all Docker layers. */
  disk_usage?: boolean;
  /** The URL or Unix socket path used to connect to the Docker API. To connect to a remote host, provide the TCP connection string. For example, V(tcp://192.0.2.23:2376). If TLS is used to encrypt the connection, the module will automatically replace C(tcp) in the connection URL with C(https). */
  docker_host?: string;
  /** Whether to list images. */
  images?: boolean;
  /** A dictionary of filter values used for selecting images to list. */
  images_filters?: Record<string, unknown>;
  /** Whether to list networks. */
  networks?: boolean;
  /** A dictionary of filter values used for selecting networks to list. */
  networks_filters?: Record<string, unknown>;
  /** The maximum amount of time in seconds to wait on a response from the API. */
  timeout?: number;
  /** Secure the connection to the API by using TLS without verifying the authenticity of the Docker host server. Note that if O(validate_certs) is set to V(true) as well, it will take precedence. */
  tls?: boolean;
  /** When verifying the authenticity of the Docker Host server, provide the expected name of the server. */
  tls_hostname?: string;
  /** For SSH transports, use the C(ssh) CLI tool instead of paramiko. */
  use_ssh_client?: boolean;
  /** Secure the connection to the API by using TLS and verifying the authenticity of the Docker host server. */
  validate_certs?: boolean;
  /** When set to V(true) and O(networks), O(volumes), O(images), O(containers), or O(disk_usage) is set to V(true) then output will contain verbose information about objects matching the full output of API method. For details see the documentation of your version of Docker API at U(https://docs.docker.com/engine/api/). */
  verbose_output?: boolean;
  /** Whether to list volumes. */
  volumes?: boolean;
  /** A dictionary of filter values used for selecting volumes to list. */
  volumes_filters?: Record<string, unknown>;
}

export interface DockerHostInfoReturn {
  /** Will be V(true) if the module can talk to the docker daemon. */
  can_talk_to_docker?: boolean;
  /** List of dict objects containing the basic information about each container. Keys matches the C(docker container ls) output unless O(verbose_output=true). See description for O(verbose_output). */
  containers?: Record<string, unknown> | Record<string, unknown>[];
  /** Information on summary disk usage by images, containers and volumes on docker host unless O(verbose_output=true). See description for O(verbose_output). */
  disk_usage?: Record<string, unknown>;
  /** Facts representing the basic state of the docker host. Matches the C(docker system info) output. */
  host_info?: Record<string, unknown>;
  /** List of dict objects containing the basic information about each image. Keys matches the C(docker image ls) output unless O(verbose_output=true). See description for O(verbose_output). */
  images?: Record<string, unknown> | Record<string, unknown>[];
  /** List of dict objects containing the basic information about each network. Keys matches the C(docker network ls) output unless O(verbose_output=true). See description for O(verbose_output). */
  networks?: Record<string, unknown> | Record<string, unknown>[];
  /** List of dict objects containing the basic information about each volume. Keys matches the C(docker volume ls) output unless O(verbose_output=true). See description for O(verbose_output). */
  volumes?: Record<string, unknown> | Record<string, unknown>[];
}
export const docker_host_info = defineRemoteModule<DockerHostInfoArgs, DockerHostInfoReturn>(spec, meta);
