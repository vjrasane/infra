import { type AnsibleModuleMeta, defineRemoteModule, type RemoteModuleSpec } from "@sensible-ts/core";

// Auto-generated from: community.docker.docker_stack_info
// DO NOT EDIT — regenerate with codegen
const meta: AnsibleModuleMeta = {
  "fqcn": "community.docker.docker_stack_info",
  "actionPlugin": false,
  "powershell": false,
  "rawParams": false,
  "checkMode": "full",
} as const;
const spec: RemoteModuleSpec = {
  fqcn: "community.docker.docker_stack_info",
  collection: { "name": "community.docker", "version": "5.4.0" },
} as const;
export interface DockerStackInfoArgs {
  /** The version of the Docker API running on the Docker Host. */
  api_version?: string;
  /** Use a CA certificate when performing server verification by providing the path to a CA certificate file. */
  ca_path?: string;
  /** The Docker CLI context to use. */
  cli_context?: string;
  /** Path to the client's TLS certificate file. */
  client_cert?: string;
  /** Path to the client's TLS key file. */
  client_key?: string;
  /** Path to the Docker CLI. If not provided, will search for Docker CLI on the E(PATH). */
  docker_cli?: string;
  /** The URL or Unix socket path used to connect to the Docker API. To connect to a remote host, provide the TCP connection string. For example, V(tcp://192.0.2.23:2376). If TLS is used to encrypt the connection, the module will automatically replace C(tcp) in the connection URL with C(https). */
  docker_host?: string;
  /** Secure the connection to the API by using TLS without verifying the authenticity of the Docker host server. Note that if O(validate_certs) is set to V(true) as well, it will take precedence. */
  tls?: boolean;
  /** When verifying the authenticity of the Docker Host server, provide the expected name of the server. */
  tls_hostname?: string;
  /** Secure the connection to the API by using TLS and verifying the authenticity of the Docker host server. */
  validate_certs?: boolean;
}

export interface DockerStackInfoReturn {
  /** List of dictionaries containing the list of stacks on the target node. */
  results?: Record<string, unknown> | Record<string, unknown>[];
}
export const docker_stack_info = defineRemoteModule<DockerStackInfoArgs, DockerStackInfoReturn>(spec, meta);
