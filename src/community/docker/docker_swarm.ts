import { type AnsibleModuleMeta, defineRemoteModule, type RemoteModuleSpec } from "module-runner";

// Auto-generated from: community.docker.docker_swarm
// DO NOT EDIT — regenerate with codegen
const meta: AnsibleModuleMeta = {
  "fqcn": "community.docker.docker_swarm",
  "actionPlugin": false,
  "powershell": false,
  "rawParams": false,
  "checkMode": "full",
} as const;
const spec: RemoteModuleSpec = {
  fqcn: "community.docker.docker_swarm",
  collection: { "name": "community.docker", "version": "5.4.0" },
} as const;
export interface DockerSwarmArgs {
  /** Externally reachable address advertised to other nodes. */
  advertise_addr?: string;
  /** The version of the Docker API running on the Docker Host. */
  api_version?: string;
  /** If set, generate a key and use it to lock data stored on the managers. */
  autolock_managers?: boolean;
  /** An integer whose purpose is to force swarm to generate a new signing CA certificate and key, if none have been specified. */
  ca_force_rotate?: number;
  /** Use a CA certificate when performing server verification by providing the path to a CA certificate file. */
  ca_path?: string;
  /** Path to the client's TLS certificate file. */
  client_cert?: string;
  /** Path to the client's TLS key file. */
  client_key?: string;
  /** Address or interface to use for data path traffic. */
  data_path_addr?: string;
  /** Port to use for data path traffic. */
  data_path_port?: number;
  /** Debug mode. */
  debug?: boolean;
  /** Default address pool in CIDR format. */
  default_addr_pool?: string | string[];
  /** The delay (in nanoseconds) for an agent to send a heartbeat to the dispatcher. */
  dispatcher_heartbeat_period?: number;
  /** The URL or Unix socket path used to connect to the Docker API. To connect to a remote host, provide the TCP connection string. For example, V(tcp://192.0.2.23:2376). If TLS is used to encrypt the connection, the module will automatically replace C(tcp) in the connection URL with C(https). */
  docker_host?: string;
  /** Amount of ticks (in seconds) needed without a leader to trigger a new election. */
  election_tick?: number;
  /** Use with state V(present) to force creating a new Swarm, even if already part of one. */
  force?: boolean;
  /** Amount of ticks (in seconds) between each heartbeat. */
  heartbeat_tick?: number;
  /** Swarm token used to join a swarm cluster. */
  join_token?: string;
  /** Number of snapshots to keep beyond the current snapshot. */
  keep_old_snapshots?: number;
  /** User-defined key/value metadata. */
  labels?: Record<string, unknown>;
  /** Listen address used for inter-manager communication. */
  listen_addr?: string;
  /** Number of log entries to keep around to sync up slow followers after a snapshot is created. */
  log_entries_for_slow_followers?: number;
  /** The name of the swarm. */
  name?: string;
  /** Automatic expiry for nodes certificates, given in nanoseconds. */
  node_cert_expiry?: number;
  /** Swarm id of the node to remove. */
  node_id?: string;
  /** Remote address of one or more manager nodes of an existing Swarm to connect to. */
  remote_addrs?: string | string[];
  /** Rotate the manager join token. */
  rotate_manager_token?: boolean;
  /** Rotate the worker join token. */
  rotate_worker_token?: boolean;
  /** The desired signing CA certificate for all swarm node TLS leaf certificates, in PEM format. */
  signing_ca_cert?: string;
  /** The desired signing CA key for all swarm node TLS leaf certificates, in PEM format. */
  signing_ca_key?: string;
  /** Number of logs entries between snapshot. */
  snapshot_interval?: number;
  /** Set to V(present), to create/update a new cluster. */
  state?: "present" | "join" | "absent" | "remove";
  /** Default address pool subnet mask length. */
  subnet_size?: number;
  /** Maximum number of tasks history stored. */
  task_history_retention_limit?: number;
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

export interface DockerSwarmReturn {
  /** Provides the actions done on the swarm. */
  actions?: string | string[];
  /** Information about swarm. */
  swarm_facts?: Record<string, unknown>;
}
export const docker_swarm = defineRemoteModule<DockerSwarmArgs, DockerSwarmReturn>(spec, meta);
