import { type AnsibleModuleMeta, defineRemoteModule, type RemoteModuleSpec } from "module-runner";

// Auto-generated from: community.docker.docker_network
// DO NOT EDIT — regenerate with codegen
const meta: AnsibleModuleMeta = {
  "fqcn": "community.docker.docker_network",
  "actionPlugin": false,
  "powershell": false,
  "rawParams": false,
  "checkMode": "full",
} as const;
const spec: RemoteModuleSpec = {
  fqcn: "community.docker.docker_network",
  collection: { "name": "community.docker", "version": "5.4.0" },
} as const;
export interface DockerNetworkArgs {
  /** The version of the Docker API running on the Docker Host. */
  api_version?: string;
  /** By default the connected list is canonical, meaning containers not on the list are removed from the network. */
  appends?: boolean;
  /** If enabled, and the network is in the global scope, non-service containers on worker nodes will be able to connect to the network. */
  attachable?: boolean;
  /** Use a CA certificate when performing server verification by providing the path to a CA certificate file. */
  ca_path?: string;
  /** Path to the client's TLS certificate file. */
  client_cert?: string;
  /** Path to the client's TLS key file. */
  client_key?: string;
  /** Specifies the config only network to use the config from. */
  config_from?: string;
  /** Sets that this is a config only network. */
  config_only?: boolean;
  /** List of container names or container IDs to connect to a network. */
  connected?: string | string[];
  /** Debug mode */
  debug?: boolean;
  /** The URL or Unix socket path used to connect to the Docker API. To connect to a remote host, provide the TCP connection string. For example, V(tcp://192.0.2.23:2376). If TLS is used to encrypt the connection, the module will automatically replace C(tcp) in the connection URL with C(https). */
  docker_host?: string;
  /** Specify the type of network. Docker provides bridge and overlay drivers, but 3rd party drivers can also be used. */
  driver?: string;
  /** Dictionary of network settings. Consult docker docs for valid options and values. */
  driver_options?: Record<string, unknown>;
  /** Enable IPv4 networking. */
  enable_ipv4?: boolean;
  /** Enable IPv6 networking. */
  enable_ipv6?: boolean;
  /** With state V(present) will disconnect all containers for existing networks, delete the network and re-create the network. */
  force?: boolean;
  /** Enable Swarm routing-mesh. */
  ingress?: boolean;
  /** Restrict external access to the network. */
  internal?: boolean;
  /** List of IPAM config blocks. Consult L(Docker docs,https://docs.docker.com/compose/compose-file/compose-file-v2/#ipam) for valid options and values. Note that O(ipam_config[].iprange) is spelled differently here (we use the notation from the Docker SDK for Python). */
  ipam_config?: Record<string, unknown> | Record<string, unknown>[];
  /** Specify an IPAM driver. */
  ipam_driver?: string;
  /** Dictionary of IPAM driver options. */
  ipam_driver_options?: Record<string, unknown>;
  /** Dictionary of labels. */
  labels?: Record<string, unknown>;
  /** Name of the network to operate on. */
  name: string;
  /** Specify the network's scope. */
  scope?: "local" | "global" | "swarm";
  /** V(absent) deletes the network. If a network has connected containers, these will be detached from the network. */
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
}

export interface DockerNetworkReturn {
  /** Network inspection results for the affected network. */
  network?: Record<string, unknown>;
}
export const docker_network = defineRemoteModule<DockerNetworkArgs, DockerNetworkReturn>(spec, meta);
