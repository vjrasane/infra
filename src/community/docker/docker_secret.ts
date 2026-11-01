import { type AnsibleModuleMeta, defineRemoteModule, type RemoteModuleSpec } from "module-runner";

// Auto-generated from: community.docker.docker_secret
// DO NOT EDIT — regenerate with codegen
const meta: AnsibleModuleMeta = {
  "fqcn": "community.docker.docker_secret",
  "actionPlugin": false,
  "powershell": false,
  "rawParams": false,
  "checkMode": "full",
} as const;
const spec: RemoteModuleSpec = {
  fqcn: "community.docker.docker_secret",
  collection: { "name": "community.docker", "version": "5.4.0" },
} as const;
export interface DockerSecretArgs {
  /** The version of the Docker API running on the Docker Host. */
  api_version?: string;
  /** Use a CA certificate when performing server verification by providing the path to a CA certificate file. */
  ca_path?: string;
  /** Path to the client's TLS certificate file. */
  client_cert?: string;
  /** Path to the client's TLS key file. */
  client_key?: string;
  /** The value of the secret. */
  data?: string;
  /** If set to V(true), the data is assumed to be Base64 encoded and will be decoded before being used. */
  data_is_b64?: boolean;
  /** The file on the target from which to read the secret. */
  data_src?: string;
  /** Debug mode. */
  debug?: boolean;
  /** The URL or Unix socket path used to connect to the Docker API. To connect to a remote host, provide the TCP connection string. For example, V(tcp://192.0.2.23:2376). If TLS is used to encrypt the connection, the module will automatically replace C(tcp) in the connection URL with C(https). */
  docker_host?: string;
  /** Use with O(state=present) to always remove and recreate an existing secret. */
  force?: boolean;
  /** A map of key:value meta data, where both key and value are expected to be strings. */
  labels?: Record<string, unknown>;
  /** The name of the secret. */
  name: string;
  /** If set to V(true), secrets are created with an increasing version number appended to their name. */
  rolling_versions?: boolean;
  /** Set to V(present), if the secret should exist, and V(absent), if it should not. */
  state?: "absent" | "present";
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
  /** When using O(rolling_versions), the number of old versions of the secret to keep. */
  versions_to_keep?: number;
}

export interface DockerSecretReturn {
  /** The ID assigned by Docker to the secret object. */
  secret_id?: string;
  /** The name of the created secret object. */
  secret_name?: string;
}
export const docker_secret = defineRemoteModule<DockerSecretArgs, DockerSecretReturn>(spec, meta);
