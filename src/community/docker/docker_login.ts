import { type AnsibleModuleMeta, defineRemoteModule, type RemoteModuleSpec } from "@sensible-ts/core";

// Auto-generated from: community.docker.docker_login
// DO NOT EDIT — regenerate with codegen
const meta: AnsibleModuleMeta = {
  "fqcn": "community.docker.docker_login",
  "actionPlugin": false,
  "powershell": false,
  "rawParams": false,
  "checkMode": "full",
} as const;
const spec: RemoteModuleSpec = {
  fqcn: "community.docker.docker_login",
  collection: { "name": "community.docker", "version": "5.4.0" },
} as const;
export interface DockerLoginArgs {
  /** The version of the Docker API running on the Docker Host. */
  api_version?: string;
  /** Use a CA certificate when performing server verification by providing the path to a CA certificate file. */
  ca_path?: string;
  /** Path to the client's TLS certificate file. */
  client_cert?: string;
  /** Path to the client's TLS key file. */
  client_key?: string;
  /** Custom path to the Docker CLI configuration file. */
  config_path?: string;
  /** Debug mode */
  debug?: boolean;
  /** The URL or Unix socket path used to connect to the Docker API. To connect to a remote host, provide the TCP connection string. For example, V(tcp://192.0.2.23:2376). If TLS is used to encrypt the connection, the module will automatically replace C(tcp) in the connection URL with C(https). */
  docker_host?: string;
  /** The plaintext password for the registry account. */
  password?: string;
  /** Refresh existing authentication found in the configuration file. */
  reauthorize?: boolean;
  /** The registry URL. */
  registry_url?: string;
  /** This controls the current state of the user. V(present) will login in a user, V(absent) will log them out. */
  state?: "present" | "absent";
  /** The maximum amount of time in seconds to wait on a response from the API. */
  timeout?: number;
  /** Secure the connection to the API by using TLS without verifying the authenticity of the Docker host server. Note that if O(validate_certs) is set to V(true) as well, it will take precedence. */
  tls?: boolean;
  /** When verifying the authenticity of the Docker Host server, provide the expected name of the server. */
  tls_hostname?: string;
  /** For SSH transports, use the C(ssh) CLI tool instead of paramiko. */
  use_ssh_client?: boolean;
  /** The username for the registry account. */
  username?: string;
  /** Secure the connection to the API by using TLS and verifying the authenticity of the Docker host server. */
  validate_certs?: boolean;
}

export interface DockerLoginReturn {
  /** Result from the login. */
  login_result?: Record<string, unknown>;
}
export const docker_login = defineRemoteModule<DockerLoginArgs, DockerLoginReturn>(spec, meta);
