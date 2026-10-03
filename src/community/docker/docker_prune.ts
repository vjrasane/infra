import { type AnsibleModuleMeta, defineRemoteModule, type RemoteModuleSpec } from "@sensible-ts/core";

// Auto-generated from: community.docker.docker_prune
// DO NOT EDIT — regenerate with codegen
const meta: AnsibleModuleMeta = {
  "fqcn": "community.docker.docker_prune",
  "actionPlugin": false,
  "powershell": false,
  "rawParams": false,
  "checkMode": "none",
} as const;
const spec: RemoteModuleSpec = {
  fqcn: "community.docker.docker_prune",
  collection: { "name": "community.docker", "version": "5.4.0" },
} as const;
export interface DockerPruneArgs {
  /** The version of the Docker API running on the Docker Host. */
  api_version?: string;
  /** Whether to prune the builder cache. */
  builder_cache?: boolean;
  /** Whether to remove all types of build cache. */
  builder_cache_all?: boolean;
  /** A dictionary of filter values used for selecting images to delete. */
  builder_cache_filters?: Record<string, unknown>;
  /** Amount of disk space to keep for cache in format C(<number>[<unit>]).". */
  builder_cache_keep_storage?: string;
  /** Use a CA certificate when performing server verification by providing the path to a CA certificate file. */
  ca_path?: string;
  /** Path to the client's TLS certificate file. */
  client_cert?: string;
  /** Path to the client's TLS key file. */
  client_key?: string;
  /** Whether to prune containers. */
  containers?: boolean;
  /** A dictionary of filter values used for selecting containers to delete. */
  containers_filters?: Record<string, unknown>;
  /** Debug mode */
  debug?: boolean;
  /** The URL or Unix socket path used to connect to the Docker API. To connect to a remote host, provide the TCP connection string. For example, V(tcp://192.0.2.23:2376). If TLS is used to encrypt the connection, the module will automatically replace C(tcp) in the connection URL with C(https). */
  docker_host?: string;
  /** Whether to prune images. */
  images?: boolean;
  /** A dictionary of filter values used for selecting images to delete. */
  images_filters?: Record<string, unknown>;
  /** Whether to prune networks. */
  networks?: boolean;
  /** A dictionary of filter values used for selecting networks to delete. */
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
  /** Whether to prune volumes. */
  volumes?: boolean;
  /** A dictionary of filter values used for selecting volumes to delete. */
  volumes_filters?: Record<string, unknown>;
}

export interface DockerPruneReturn {
  /** The build caches that were deleted. */
  builder_cache_caches_deleted?: string | string[];
  /** Amount of reclaimed disk space from builder cache pruning in bytes. */
  builder_cache_space_reclaimed?: number;
  /** List of IDs of deleted containers. */
  containers?: string | string[];
  /** Amount of reclaimed disk space from container pruning in bytes. */
  containers_space_reclaimed?: number;
  /** List of IDs of deleted images. */
  images?: string | string[];
  /** Amount of reclaimed disk space from image pruning in bytes. */
  images_space_reclaimed?: number;
  /** List of IDs of deleted networks. */
  networks?: string | string[];
  /** List of IDs of deleted volumes. */
  volumes?: string | string[];
  /** Amount of reclaimed disk space from volumes pruning in bytes. */
  volumes_space_reclaimed?: number;
}
export const docker_prune = defineRemoteModule<DockerPruneArgs, DockerPruneReturn>(spec, meta);
