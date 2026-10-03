import { type AnsibleModuleMeta, defineRemoteModule, type RemoteModuleSpec } from "@sensible-ts/core";

// Auto-generated from: community.docker.docker_compose_v2
// DO NOT EDIT — regenerate with codegen
const meta: AnsibleModuleMeta = {
  "fqcn": "community.docker.docker_compose_v2",
  "actionPlugin": false,
  "powershell": false,
  "rawParams": false,
  "checkMode": "full",
} as const;
const spec: RemoteModuleSpec = {
  fqcn: "community.docker.docker_compose_v2",
  collection: { "name": "community.docker", "version": "5.4.0" },
} as const;
export interface DockerComposeV2Args {
  /** The version of the Docker API running on the Docker Host. */
  api_version?: string;
  /** When O(assume_yes=true), pass C(-y)/C(--yes) to assume "yes" as answer to all prompts and run non-interactively. */
  assume_yes?: boolean;
  /** Whether to build images before starting containers. This is used when C(docker compose up) is run. */
  build?: "always" | "never" | "policy";
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
  /** When O(state) is V(present) or V(restarted), specify whether or not to include linked services. */
  dependencies?: boolean;
  /** Path to the Docker CLI. If not provided, will search for Docker CLI on the E(PATH). */
  docker_cli?: string;
  /** The URL or Unix socket path used to connect to the Docker API. To connect to a remote host, provide the TCP connection string. For example, V(tcp://192.0.2.23:2376). If TLS is used to encrypt the connection, the module will automatically replace C(tcp) in the connection URL with C(https). */
  docker_host?: string;
  /** By default environment files are loaded from a C(.env) file located directly under the O(project_src) directory. */
  env_files?: string | string[];
  /** List of Compose file names relative to O(project_src) to be used instead of the main Compose file (C(compose.yml), C(compose.yaml), C(docker-compose.yml), or C(docker-compose.yaml)). */
  files?: string | string[];
  /** Ignores image building events for change detection. */
  ignore_build_events?: boolean;
  /** List of profiles to enable when starting services. */
  profiles?: string | string[];
  /** Provide a project name. If not provided, the project name is taken from the basename of O(project_src). */
  project_name?: string;
  /** Path to a directory containing a Compose file (C(compose.yml), C(compose.yaml), C(docker-compose.yml), or C(docker-compose.yaml)). */
  project_src?: string;
  /** Whether to pull images before running. This is used when C(docker compose up) is run. */
  pull?: "always" | "missing" | "never" | "policy";
  /** By default containers will be recreated when their configuration differs from the service definition. */
  recreate?: "always" | "never" | "auto";
  /** Use with O(state=absent) to remove all images or only local images. */
  remove_images?: "all" | "local";
  /** Remove containers for services not defined in the Compose file. */
  remove_orphans?: boolean;
  /** Use with O(state=absent) to remove data volumes. */
  remove_volumes?: boolean;
  /** Whether to recreate instead of reuse anonymous volumes from previous containers. */
  renew_anon_volumes?: boolean;
  /** Define how to scale services when running C(docker compose up). */
  scale?: Record<string, unknown>;
  /** Specifies a subset of services to be targeted. */
  services?: string | string[];
  /** Desired state of the project. */
  state?: "absent" | "stopped" | "restarted" | "present";
  /** Timeout in seconds for container shutdown when attached or when containers are already running. */
  timeout?: number;
  /** Secure the connection to the API by using TLS without verifying the authenticity of the Docker host server. Note that if O(validate_certs) is set to V(true) as well, it will take precedence. */
  tls?: boolean;
  /** When verifying the authenticity of the Docker Host server, provide the expected name of the server. */
  tls_hostname?: string;
  /** Secure the connection to the API by using TLS and verifying the authenticity of the Docker host server. */
  validate_certs?: boolean;
  /** When running C(docker compose up), pass C(--wait) to wait for services to be running/healthy. */
  wait?: boolean;
  /** When O(wait=true), wait at most this amount of seconds. */
  wait_timeout?: number;
}

export interface DockerComposeV2Return {
  /** A list of actions that have been applied. */
  actions?: Record<string, unknown> | Record<string, unknown>[];
  /** A list of containers associated to the service. */
  containers?: Record<string, unknown> | Record<string, unknown>[];
  /** A list of images associated to the service. */
  images?: Record<string, unknown> | Record<string, unknown>[];
}
export const docker_compose_v2 = defineRemoteModule<DockerComposeV2Args, DockerComposeV2Return>(spec, meta);
