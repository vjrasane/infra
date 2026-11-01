import { type AnsibleModuleMeta, defineRemoteModule, type RemoteModuleSpec } from "module-runner";

// Auto-generated from: community.docker.docker_compose_v2_exec
// DO NOT EDIT — regenerate with codegen
const meta: AnsibleModuleMeta = {
  "fqcn": "community.docker.docker_compose_v2_exec",
  "actionPlugin": false,
  "powershell": false,
  "rawParams": false,
  "checkMode": "none",
} as const;
const spec: RemoteModuleSpec = {
  fqcn: "community.docker.docker_compose_v2_exec",
  collection: { "name": "community.docker", "version": "5.4.0" },
} as const;
export interface DockerComposeV2ExecArgs {
  /** The version of the Docker API running on the Docker Host. */
  api_version?: string;
  /** The command to execute. */
  argv?: string | string[];
  /** Use a CA certificate when performing server verification by providing the path to a CA certificate file. */
  ca_path?: string;
  /** The directory to run the command in. */
  chdir?: string;
  /** If set to V(false), the module will not check whether one of the files C(compose.yaml), C(compose.yml), C(docker-compose.yaml), or C(docker-compose.yml) exists in O(project_src) if O(files) is not provided. */
  check_files_existing?: boolean;
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
  /** Dictionary of environment variables with their respective values to be passed to the command ran inside the container. */
  env?: Record<string, unknown>;
  /** By default environment files are loaded from a C(.env) file located directly under the O(project_src) directory. */
  env_files?: string | string[];
  /** List of Compose file names relative to O(project_src) to be used instead of the main Compose file (C(compose.yml), C(compose.yaml), C(docker-compose.yml), or C(docker-compose.yaml)). */
  files?: string | string[];
  /** The index of the container to run the command in if the service has multiple replicas. */
  index?: number;
  /** Whether to give extended privileges to the process. */
  privileged?: boolean;
  /** List of profiles to enable when starting services. */
  profiles?: string | string[];
  /** Provide a project name. If not provided, the project name is taken from the basename of O(project_src). */
  project_name?: string;
  /** Path to a directory containing a Compose file (C(compose.yml), C(compose.yaml), C(docker-compose.yml), or C(docker-compose.yaml)). */
  project_src?: string;
  /** The service to run the command in. */
  service: string;
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
  /** If specified, the user to execute this command with. */
  user?: string;
  /** Secure the connection to the API by using TLS and verifying the authenticity of the Docker host server. */
  validate_certs?: boolean;
}

export interface DockerComposeV2ExecReturn {
  /** The exit code of the command. */
  rc?: number;
  /** The standard error output of the container command. */
  stderr?: string;
  /** The standard output of the container command. */
  stdout?: string;
}
export const docker_compose_v2_exec = defineRemoteModule<DockerComposeV2ExecArgs, DockerComposeV2ExecReturn>(
  spec,
  meta,
);
