import { type AnsibleModuleMeta, defineRemoteModule, type RemoteModuleSpec } from "module-runner";

// Auto-generated from: community.docker.docker_container_copy_into
// DO NOT EDIT — regenerate with codegen
const meta: AnsibleModuleMeta = {
  "fqcn": "community.docker.docker_container_copy_into",
  "actionPlugin": true,
  "powershell": false,
  "rawParams": false,
  "checkMode": "full",
} as const;
const spec: RemoteModuleSpec = {
  fqcn: "community.docker.docker_container_copy_into",
  collection: { "name": "community.docker", "version": "5.4.0" },
} as const;
export interface DockerContainerCopyIntoArgs {
  /** The version of the Docker API running on the Docker Host. */
  api_version?: string;
  /** Use a CA certificate when performing server verification by providing the path to a CA certificate file. */
  ca_path?: string;
  /** Path to the client's TLS certificate file. */
  client_cert?: string;
  /** Path to the client's TLS key file. */
  client_key?: string;
  /** The name of the container to copy files to. */
  container: string;
  /** Path to a file inside the Docker container. */
  container_path: string;
  /** The file's content. */
  content?: string;
  /** If set to V(true), the content in O(content) is assumed to be Base64 encoded and will be decoded before being used. */
  content_is_b64?: boolean;
  /** Debug mode */
  debug?: boolean;
  /** The URL or Unix socket path used to connect to the Docker API. To connect to a remote host, provide the TCP connection string. For example, V(tcp://192.0.2.23:2376). If TLS is used to encrypt the connection, the module will automatically replace C(tcp) in the connection URL with C(https). */
  docker_host?: string;
  /** This flag indicates that filesystem links in the Docker container, if they exist, should be followed. */
  follow?: boolean;
  /** If set to V(true), force writing the file (without performing any idempotency checks). */
  force?: boolean;
  /** The group ID to use when writing the file to disk. */
  group_id?: number;
  /** This flag indicates that filesystem links in the source tree (where the module is executed), if they exist, should be followed. */
  local_follow?: boolean;
  /** The file mode to use when writing the file to disk. */
  mode?: unknown;
  /** Determines how to parse the O(mode) parameter. */
  mode_parse?: string;
  /** The owner ID to use when writing the file to disk. */
  owner_id?: number;
  /** Path to a file on the managed node. */
  path?: string;
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
}

export interface DockerContainerCopyIntoReturn {
  /** The actual path in the container. */
  container_path?: string;
}
export const docker_container_copy_into = defineRemoteModule<
  DockerContainerCopyIntoArgs,
  DockerContainerCopyIntoReturn
>(spec, meta);
