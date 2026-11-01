import { type AnsibleModuleMeta, defineRemoteModule, type RemoteModuleSpec } from "module-runner";

// Auto-generated from: community.docker.docker_container_exec
// DO NOT EDIT — regenerate with codegen
const meta: AnsibleModuleMeta = {
  "fqcn": "community.docker.docker_container_exec",
  "actionPlugin": false,
  "powershell": false,
  "rawParams": false,
  "checkMode": "none",
} as const;
const spec: RemoteModuleSpec = {
  fqcn: "community.docker.docker_container_exec",
  collection: { "name": "community.docker", "version": "5.4.0" },
} as const;
export interface DockerContainerExecArgs {
  /** The version of the Docker API running on the Docker Host. */
  api_version?: string;
  /** The command to execute. */
  argv?: string | string[];
  /** Use a CA certificate when performing server verification by providing the path to a CA certificate file. */
  ca_path?: string;
  /** The directory to run the command in. */
  chdir?: string;
  /** Path to the client's TLS certificate file. */
  client_cert?: string;
  /** Path to the client's TLS key file. */
  client_key?: string;
  /** The command to execute. */
  command?: string;
  /** The name of the container to execute the command in. */
  container: string;
  /** Debug mode */
  debug?: boolean;
  /** Whether to run the command synchronously (O(detach=false), default) or asynchronously (O(detach=true)). */
  detach?: boolean;
  /** The URL or Unix socket path used to connect to the Docker API. To connect to a remote host, provide the TCP connection string. For example, V(tcp://192.0.2.23:2376). If TLS is used to encrypt the connection, the module will automatically replace C(tcp) in the connection URL with C(https). */
  docker_host?: string;
  /** Dictionary of environment variables with their respective values to be passed to the command ran inside the container. */
  env?: Record<string, unknown>;
  /** Set the stdin of the command directly to the specified value. */
  stdin?: string;
  /** If set to V(true), appends a newline to O(stdin). */
  stdin_add_newline?: boolean;
  /** Strip empty lines from the end of stdout/stderr in result. */
  strip_empty_ends?: boolean;
  /** The maximum amount of time in seconds to wait on a response from the API. */
  timeout?: number;
  /** Secure the connection to the API by using TLS without verifying the authenticity of the Docker host server. Note that if O(validate_certs) is set to V(true) as well, it will take precedence. */
  tls?: boolean;
  /** When verifying the authenticity of the Docker Host server, provide the expected name of the server. */
  tls_hostname?: string;
  /** Whether to allocate a TTY. */
  tty?: boolean;
  /** For SSH transports, use the C(ssh) CLI tool instead of paramiko. */
  use_ssh_client?: boolean;
  /** If specified, the user to execute this command with. */
  user?: string;
  /** Secure the connection to the API by using TLS and verifying the authenticity of the Docker host server. */
  validate_certs?: boolean;
}

export interface DockerContainerExecReturn {
  /** The execution ID of the command. */
  exec_id?: string;
  /** The exit code of the command. */
  rc?: number;
  /** The standard error output of the container command. */
  stderr?: string;
  /** The standard output of the container command. */
  stdout?: string;
}
export const docker_container_exec = defineRemoteModule<DockerContainerExecArgs, DockerContainerExecReturn>(spec, meta);
