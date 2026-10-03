import { type AnsibleModuleMeta, defineRemoteModule, type RemoteModuleSpec } from "@sensible-ts/core";

// Auto-generated from: community.docker.docker_volume
// DO NOT EDIT — regenerate with codegen
const meta: AnsibleModuleMeta = {
  "fqcn": "community.docker.docker_volume",
  "actionPlugin": false,
  "powershell": false,
  "rawParams": false,
  "checkMode": "full",
} as const;
const spec: RemoteModuleSpec = {
  fqcn: "community.docker.docker_volume",
  collection: { "name": "community.docker", "version": "5.4.0" },
} as const;
export interface DockerVolumeArgs {
  /** The version of the Docker API running on the Docker Host. */
  api_version?: string;
  /** Use a CA certificate when performing server verification by providing the path to a CA certificate file. */
  ca_path?: string;
  /** Path to the client's TLS certificate file. */
  client_cert?: string;
  /** Path to the client's TLS key file. */
  client_key?: string;
  /** Debug mode */
  debug?: boolean;
  /** The URL or Unix socket path used to connect to the Docker API. To connect to a remote host, provide the TCP connection string. For example, V(tcp://192.0.2.23:2376). If TLS is used to encrypt the connection, the module will automatically replace C(tcp) in the connection URL with C(https). */
  docker_host?: string;
  /** Specify the type of volume. Docker provides the V(local) driver, but 3rd party drivers can also be used. */
  driver?: string;
  /** Dictionary of volume settings. Consult the Docker documentation for valid options and values: U(https://docs.docker.com/engine/reference/commandline/volume_create/#driver-specific-options). */
  driver_options?: Record<string, unknown>;
  /** Dictionary of label key/values to set for the volume. */
  labels?: Record<string, unknown>;
  /** Controls when a volume will be recreated when O(state=present). Please note that recreating an existing volume will cause B(any data in the existing volume to be lost!) The volume will be deleted and a new volume with the same name will be created. */
  recreate?: "always" | "never" | "options-changed";
  /** V(absent) deletes the volume. */
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
  /** Name of the volume to operate on. */
  volume_name: string;
}

export interface DockerVolumeReturn {
  /** Volume inspection results for the affected volume. */
  volume?: Record<string, unknown>;
}
export const docker_volume = defineRemoteModule<DockerVolumeArgs, DockerVolumeReturn>(spec, meta);
