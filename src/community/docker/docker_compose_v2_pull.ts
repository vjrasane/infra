import { type AnsibleModuleMeta, defineRemoteModule, type RemoteModuleSpec } from "@sensible-ts/core";

// Auto-generated from: community.docker.docker_compose_v2_pull
// DO NOT EDIT — regenerate with codegen
const meta: AnsibleModuleMeta = {
  "fqcn": "community.docker.docker_compose_v2_pull",
  "actionPlugin": false,
  "powershell": false,
  "rawParams": false,
  "checkMode": "full",
} as const;
const spec: RemoteModuleSpec = {
  fqcn: "community.docker.docker_compose_v2_pull",
  collection: { "name": "community.docker", "version": "5.4.0" },
} as const;
export interface DockerComposeV2PullArgs {
  /** The version of the Docker API running on the Docker Host. */
  api_version?: string;
  /** Use a CA certificate when performing server verification by providing the path to a CA certificate file. */
  ca_path?: string;
  /** If set to V(false), the module will not check whether one of the files C(compose.yaml), C(compose.yml), C(docker-compose.yaml), or C(docker-compose.yml) exists in O(project_src) if O(files) is not provided. */
  check_files_existing?: boolean;
  /** The Docker CLI context to use. */
  cli_context?: string;
  /** Path to the client's TLS certificate file. */
  client_cert?: string;
  /** Path to the client's TLS key file. */
  client_key?: string;
  /** Compose file describing one or more services, networks and volumes. */
  definition?: Record<string, unknown>;
  /** Path to the Docker CLI. If not provided, will search for Docker CLI on the E(PATH). */
  docker_cli?: string;
  /** The URL or Unix socket path used to connect to the Docker API. To connect to a remote host, provide the TCP connection string. For example, V(tcp://192.0.2.23:2376). If TLS is used to encrypt the connection, the module will automatically replace C(tcp) in the connection URL with C(https). */
  docker_host?: string;
  /** By default environment files are loaded from a C(.env) file located directly under the O(project_src) directory. */
  env_files?: string | string[];
  /** List of Compose file names relative to O(project_src) to be used instead of the main Compose file (C(compose.yml), C(compose.yaml), C(docker-compose.yml), or C(docker-compose.yaml)). */
  files?: string | string[];
  /** If set to V(true), will not pull images that can be built. */
  ignore_buildable?: boolean;
  /** If set to V(true), will pull what it can and ignores images with pull failures. */
  ignore_pull_failures?: boolean;
  /** If set to V(true), also pull services that are declared as dependencies. */
  include_deps?: boolean;
  /** Whether to pull images before running. This is used when C(docker compose up) is ran. */
  policy?: "always" | "missing";
  /** List of profiles to enable when starting services. */
  profiles?: string | string[];
  /** Provide a project name. If not provided, the project name is taken from the basename of O(project_src). */
  project_name?: string;
  /** Path to a directory containing a Compose file (C(compose.yml), C(compose.yaml), C(docker-compose.yml), or C(docker-compose.yaml)). */
  project_src?: string;
  /** Specifies a subset of services to be targeted. */
  services?: string | string[];
  /** Secure the connection to the API by using TLS without verifying the authenticity of the Docker host server. Note that if O(validate_certs) is set to V(true) as well, it will take precedence. */
  tls?: boolean;
  /** When verifying the authenticity of the Docker Host server, provide the expected name of the server. */
  tls_hostname?: string;
  /** Secure the connection to the API by using TLS and verifying the authenticity of the Docker host server. */
  validate_certs?: boolean;
}

export interface DockerComposeV2PullReturn {
  /** A list of actions that have been applied. */
  actions?: Record<string, unknown> | Record<string, unknown>[];
}
export const docker_compose_v2_pull = defineRemoteModule<DockerComposeV2PullArgs, DockerComposeV2PullReturn>(
  spec,
  meta,
);
