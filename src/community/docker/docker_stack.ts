import { type AnsibleModuleMeta, defineRemoteModule, type RemoteModuleSpec } from "module-runner";

// Auto-generated from: community.docker.docker_stack
// DO NOT EDIT — regenerate with codegen
const meta: AnsibleModuleMeta = {
  "fqcn": "community.docker.docker_stack",
  "actionPlugin": false,
  "powershell": false,
  "rawParams": false,
  "checkMode": "none",
} as const;
const spec: RemoteModuleSpec = {
  fqcn: "community.docker.docker_stack",
  collection: { "name": "community.docker", "version": "5.4.0" },
} as const;
export interface DockerStackArgs {
  /** If larger than V(0) and O(state=absent) the module will retry up to O(absent_retries) times to delete the stack until all the resources have been effectively deleted. If the last try still reports the stack as not completely removed the module will fail. */
  absent_retries?: number;
  /** Interval in seconds between consecutive O(absent_retries). */
  absent_retries_interval?: number;
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
  /** List of compose definitions. Any element may be a string referring to the path of the compose file on the target host or the YAML contents of a compose file nested as dictionary. */
  compose?: unknown | unknown[];
  /** If V(false), the C(--detach=false) option is added to the C(docker stack deploy) command, allowing Docker to wait for tasks to converge before exiting. */
  detach?: boolean;
  /** Path to the Docker CLI. If not provided, will search for Docker CLI on the E(PATH). */
  docker_cli?: string;
  /** The URL or Unix socket path used to connect to the Docker API. To connect to a remote host, provide the TCP connection string. For example, V(tcp://192.0.2.23:2376). If TLS is used to encrypt the connection, the module will automatically replace C(tcp) in the connection URL with C(https). */
  docker_host?: string;
  /** Stack name. */
  name: string;
  /** If true will add the C(--prune) option to the C(docker stack deploy) command. This will have docker remove the services not present in the current stack definition. */
  prune?: boolean;
  /** If set will add the C(--resolve-image) option to the C(docker stack deploy) command. This will have docker query the registry to resolve image digest and supported platforms. If not set, docker use "always" by default. */
  resolve_image?: "always" | "changed" | "never";
  /** Service state. */
  state?: "present" | "absent";
  /** Secure the connection to the API by using TLS without verifying the authenticity of the Docker host server. Note that if O(validate_certs) is set to V(true) as well, it will take precedence. */
  tls?: boolean;
  /** When verifying the authenticity of the Docker Host server, provide the expected name of the server. */
  tls_hostname?: string;
  /** Secure the connection to the API by using TLS and verifying the authenticity of the Docker host server. */
  validate_certs?: boolean;
  /** If true will add the C(--with-registry-auth) option to the C(docker stack deploy) command. This will have docker send registry authentication details to Swarm agents. */
  with_registry_auth?: boolean;
}

export interface DockerStackReturn {
  /** Dictionary containing the differences between the 'Spec' field
of the stack services before and after applying the new stack
definition. */
  stack_spec_diff?: Record<string, unknown>;
}
export const docker_stack = defineRemoteModule<DockerStackArgs, DockerStackReturn>(spec, meta);
