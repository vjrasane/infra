import { type AnsibleModuleMeta, defineRemoteModule, type RemoteModuleSpec } from "@sensible-ts/core";

// Auto-generated from: community.docker.docker_compose_v2_run
// DO NOT EDIT — regenerate with codegen
const meta: AnsibleModuleMeta = {
  "fqcn": "community.docker.docker_compose_v2_run",
  "actionPlugin": false,
  "powershell": false,
  "rawParams": false,
  "checkMode": "none",
} as const;
const spec: RemoteModuleSpec = {
  fqcn: "community.docker.docker_compose_v2_run",
  collection: { "name": "community.docker", "version": "5.4.0" },
} as const;
export interface DockerComposeV2RunArgs {
  /** The version of the Docker API running on the Docker Host. */
  api_version?: string;
  /** The command to execute. */
  argv?: string | string[];
  /** Build image before starting container. */
  build?: boolean;
  /** Use a CA certificate when performing server verification by providing the path to a CA certificate file. */
  ca_path?: string;
  /** Linux capabilities to add to the container. */
  cap_add?: string | string[];
  /** Linux capabilities to drop from the container. */
  cap_drop?: string | string[];
  /** The directory to run the command in. */
  chdir?: string;
  /** If set to V(false), the module will not check whether one of the files C(compose.yaml), C(compose.yml), C(docker-compose.yaml), or C(docker-compose.yml) exists in O(project_src) if O(files) is not provided. */
  check_files_existing?: boolean;
  /** Automatically remove th econtainer when it exits. */
  cleanup?: boolean;
  /** The Docker CLI context to use. */
  cli_context?: string;
  /** Path to the client's TLS certificate file. */
  client_cert?: string;
  /** Path to the client's TLS key file. */
  client_key?: string;
  /** The command to execute. */
  command?: string;
  /** Compose file describing one or more services, networks and volumes. */
  definition?: Record<string, unknown>;
  /** Whether to run the command synchronously (O(detach=false), default) or asynchronously (O(detach=true)). */
  detach?: boolean;
  /** Path to the Docker CLI. If not provided, will search for Docker CLI on the E(PATH). */
  docker_cli?: string;
  /** The URL or Unix socket path used to connect to the Docker API. To connect to a remote host, provide the TCP connection string. For example, V(tcp://192.0.2.23:2376). If TLS is used to encrypt the connection, the module will automatically replace C(tcp) in the connection URL with C(https). */
  docker_host?: string;
  /** Override the entrypoint of the container image. */
  entrypoint?: string;
  /** Dictionary of environment variables with their respective values to be passed to the command ran inside the container. */
  env?: Record<string, unknown>;
  /** By default environment files are loaded from a C(.env) file located directly under the O(project_src) directory. */
  env_files?: string | string[];
  /** List of Compose file names relative to O(project_src) to be used instead of the main Compose file (C(compose.yml), C(compose.yaml), C(docker-compose.yml), or C(docker-compose.yaml)). */
  files?: string | string[];
  /** Whether to keep STDIN open even if not attached. */
  interactive?: boolean;
  /** Add or override labels to the container. */
  labels?: string | string[];
  /** Assign a name to the container. */
  name?: string;
  /** Do not start linked services. */
  no_deps?: boolean;
  /** List of profiles to enable when starting services. */
  profiles?: string | string[];
  /** Provide a project name. If not provided, the project name is taken from the basename of O(project_src). */
  project_name?: string;
  /** Path to a directory containing a Compose file (C(compose.yml), C(compose.yaml), C(docker-compose.yml), or C(docker-compose.yaml)). */
  project_src?: string;
  /** Publish a container's port(s) to the host. */
  publish?: string | string[];
  /** Pull without printing progress information. */
  quiet_pull?: boolean;
  /** Remove containers for services not defined in the Compose file. */
  remove_orphans?: boolean;
  /** The service to run the command in. */
  service: string;
  /** Run command with all service's ports enabled and mapped to the host. */
  service_ports?: boolean;
  /** Set the stdin of the command directly to the specified value. */
  stdin?: string;
  /** If set to V(true), appends a newline to O(stdin). */
  stdin_add_newline?: boolean;
  /** Strip empty lines from the end of stdout/stderr in result. */
  strip_empty_ends?: boolean;
  /** Secure the connection to the API by using TLS without verifying the authenticity of the Docker host server. Note that if O(validate_certs) is set to V(true) as well, it will take precedence. */
  tls?: boolean;
  /** When verifying the authenticity of the Docker Host server, provide the expected name of the server. */
  tls_hostname?: string;
  /** Whether to allocate a TTY. */
  tty?: boolean;
  /** Use the service's network C(useAliases) in the network(s) the container connects to. */
  use_aliases?: boolean;
  /** If specified, the user to execute this command with. */
  user?: string;
  /** Secure the connection to the API by using TLS and verifying the authenticity of the Docker host server. */
  validate_certs?: boolean;
  /** Bind mount one or more volumes. */
  volumes?: string | string[];
}

export interface DockerComposeV2RunReturn {
  /** The ID of the created container. */
  container_id?: string;
  /** The exit code of the command. */
  rc?: number;
  /** The standard error output of the container command. */
  stderr?: string;
  /** The standard output of the container command. */
  stdout?: string;
}
export const docker_compose_v2_run = defineRemoteModule<DockerComposeV2RunArgs, DockerComposeV2RunReturn>(spec, meta);
