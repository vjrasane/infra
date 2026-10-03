import { type AnsibleModuleMeta, defineRemoteModule, type RemoteModuleSpec } from "@sensible-ts/core";

// Auto-generated from: community.docker.docker_container
// DO NOT EDIT — regenerate with codegen
const meta: AnsibleModuleMeta = {
  "fqcn": "community.docker.docker_container",
  "actionPlugin": false,
  "powershell": false,
  "rawParams": false,
  "checkMode": "partial",
} as const;
const spec: RemoteModuleSpec = {
  fqcn: "community.docker.docker_container",
  collection: { "name": "community.docker", "version": "5.4.0" },
} as const;
export interface DockerContainerArgs {
  /** The version of the Docker API running on the Docker Host. */
  api_version?: string;
  /** Enable auto-removal of the container on daemon side when the container's process exits. */
  auto_remove?: boolean;
  /** Block IO (relative weight), between 10 and 1000. */
  blkio_weight?: number;
  /** Use a CA certificate when performing server verification by providing the path to a CA certificate file. */
  ca_path?: string;
  /** List of capabilities to drop from the container. */
  cap_drop?: string | string[];
  /** List of capabilities to add to the container. */
  capabilities?: string | string[];
  /** Specify the parent cgroup for the container. */
  cgroup_parent?: string;
  /** Specify the cgroup namespace mode for the container. */
  cgroupns_mode?: "host" | "private";
  /** Use with O(detach=false) to remove the container after successful execution. */
  cleanup?: boolean;
  /** Path to the client's TLS certificate file. */
  client_cert?: string;
  /** Path to the client's TLS key file. */
  client_key?: string;
  /** Command to execute when the container starts. A command may be either a string or a list. */
  command?: unknown;
  /** The default behavior for O(command) (when provided as a list) and O(entrypoint) is to convert them to strings without considering shell quoting rules. (For comparing idempotency, the resulting string is split considering shell quoting rules). */
  command_handling?: "compatibility" | "correct";
  /** Allows to specify how properties of existing containers are compared with module options to decide whether the container should be recreated / updated or not. */
  comparisons?: Record<string, unknown>;
  /** In older versions of this module, various module options used to have default values. This caused problems with containers which use different values for these options. */
  container_default_behavior?: "compatibility" | "no_defaults";
  /** Limit CPU CFS (Completely Fair Scheduler) period. */
  cpu_period?: number;
  /** Limit CPU CFS (Completely Fair Scheduler) quota. */
  cpu_quota?: number;
  /** CPU shares (relative weight). */
  cpu_shares?: number;
  /** Specify how much of the available CPU resources a container can use. */
  cpus?: number;
  /** CPUs in which to allow execution. */
  cpuset_cpus?: string;
  /** Memory nodes (MEMs) in which to allow execution V(0-3) or V(0,1). */
  cpuset_mems?: string;
  /** Debug mode */
  debug?: boolean;
  /** Define the default host IP to use. */
  default_host_ip?: string;
  /** Enable detached mode to leave the container running in background. */
  detach?: boolean;
  /** List of cgroup rules to apply to the container. */
  device_cgroup_rules?: string | string[];
  /** List of device path and read rate (bytes per second) from device. */
  device_read_bps?: Record<string, unknown> | Record<string, unknown>[];
  /** List of device and read rate (IO per second) from device. */
  device_read_iops?: Record<string, unknown> | Record<string, unknown>[];
  /** Allows to request additional resources, such as GPUs. */
  device_requests?: Record<string, unknown> | Record<string, unknown>[];
  /** List of device and write rate (bytes per second) to device. */
  device_write_bps?: Record<string, unknown> | Record<string, unknown>[];
  /** List of device and write rate (IO per second) to device. */
  device_write_iops?: Record<string, unknown> | Record<string, unknown>[];
  /** List of host device bindings to add to the container. */
  devices?: string | string[];
  /** List of DNS options. */
  dns_opts?: string | string[];
  /** List of custom DNS search domains. */
  dns_search_domains?: string | string[];
  /** List of custom DNS servers. */
  dns_servers?: string | string[];
  /** The URL or Unix socket path used to connect to the Docker API. To connect to a remote host, provide the TCP connection string. For example, V(tcp://192.0.2.23:2376). If TLS is used to encrypt the connection, the module will automatically replace C(tcp) in the connection URL with C(https). */
  docker_host?: string;
  /** Container domainname. */
  domainname?: string;
  /** Command that overwrites the default C(ENTRYPOINT) of the image. */
  entrypoint?: string | string[];
  /** Dictionary of key,value pairs. */
  env?: Record<string, unknown>;
  /** Path to a file, present on the target, containing environment variables C(FOO=BAR). */
  env_file?: string;
  /** Dict of host-to-IP mappings, where each host name is a key in the dictionary. Each host name will be added to the container's C(/etc/hosts) file. */
  etc_hosts?: Record<string, unknown>;
  /** List of additional container ports which informs Docker that the container listens on the specified network ports at runtime. */
  exposed_ports?: string | string[];
  /** Use the kill command when stopping a running container. */
  force_kill?: boolean;
  /** List of additional group names and/or IDs that the container process will run as. */
  groups?: string | string[];
  /** Configure a check that is run to determine whether or not containers for this service are "healthy". */
  healthcheck?: {
    interval?: string;
    retries?: number;
    start_interval?: string;
    start_period?: string;
    test?: unknown;
    test_cli_compatible?: boolean;
    timeout?: string;
  };
  /** When waiting for the container to become healthy if O(state=healthy), this option controls how long the module waits until the container state becomes healthy. */
  healthy_wait_timeout?: number;
  /** The container's hostname. */
  hostname?: string;
  /** Repository path and tag used to create the container. If an image is not found or pull is true, the image will be pulled from the registry. If no tag is included, V(latest) will be used. */
  image?: string;
  /** Determines which image to use for idempotency checks that depend on image parameters. */
  image_comparison?: "desired-image" | "current-image";
  /** How to handle labels inherited from the image that are not set explicitly. */
  image_label_mismatch?: "ignore" | "fail";
  /** Determines what the module does if the image matches, but the image name in the container's configuration does not match the image name provided to the module. */
  image_name_mismatch?: "recreate" | "ignore";
  /** Run an init inside the container that forwards signals and reaps processes. */
  init?: boolean;
  /** Keep stdin open after a container is launched, even if not attached. */
  interactive?: boolean;
  /** Set the IPC mode for the container. */
  ipc_mode?: string;
  /** Retain anonymous volumes associated with a removed container. */
  keep_volumes?: boolean;
  /** Kernel memory limit in format C(<number>[<unit>]). Number is a positive integer. Unit can be V(B) (byte), V(K) (kibibyte, 1024B), V(M) (mebibyte), V(G) (gibibyte), V(T) (tebibyte), or V(P) (pebibyte). Minimum is V(4M). */
  kernel_memory?: string;
  /** Override default signal used to kill a running container. */
  kill_signal?: string;
  /** Dictionary of key value pairs. */
  labels?: Record<string, unknown>;
  /** List of name aliases for linked containers in the format C(container_name:alias). */
  links?: string | string[];
  /** Specify the logging driver. Docker uses V(json-file) by default. */
  log_driver?: string;
  /** Dictionary of options specific to the chosen O(log_driver). */
  log_options?: Record<string, unknown>;
  /** Container MAC address (for example, V(92:d0:c6:0a:29:33)). */
  mac_address?: string;
  /** Memory limit in format C(<number>[<unit>]). Number is a positive integer. Unit can be V(B) (byte), V(K) (kibibyte, 1024B), V(M) (mebibyte), V(G) (gibibyte), V(T) (tebibyte), or V(P) (pebibyte). */
  memory?: string;
  /** Memory soft limit in format C(<number>[<unit>]). Number is a positive integer. Unit can be V(B) (byte), V(K) (kibibyte, 1024B), V(M) (mebibyte), V(G) (gibibyte), V(T) (tebibyte), or V(P) (pebibyte). */
  memory_reservation?: string;
  /** Total memory limit (memory + swap) in format C(<number>[<unit>]), or the special values V(unlimited) or V(-1) for unlimited swap usage. Number is a positive integer. Unit can be V(B) (byte), V(K) (kibibyte, 1024B), V(M) (mebibyte), V(G) (gibibyte), V(T) (tebibyte), or V(P) (pebibyte). */
  memory_swap?: string;
  /** Tune a container's memory swappiness behavior. Accepts an integer between 0 and 100. */
  memory_swappiness?: number;
  /** Specification for mounts to be added to the container. More powerful alternative to O(volumes). */
  mounts?: Record<string, unknown> | Record<string, unknown>[];
  /** Assign a name to a new container or match an existing container. */
  name: string;
  /** Connect the container to a network. Choices are V(bridge), V(host), V(none), C(container:<name|id>), C(<network_name>) or V(default). */
  network_mode?: string;
  /** List of networks the container belongs to. */
  networks?: Record<string, unknown> | Record<string, unknown>[];
  /** If O(networks_cli_compatible=true) (default), this module will behave as C(docker run --network) and will B(not) add the default network if O(networks) is specified. If O(networks) is not specified, the default network will be attached. */
  networks_cli_compatible?: boolean;
  /** Whether or not to disable OOM Killer for the container. */
  oom_killer?: boolean;
  /** An integer value containing the score given to the container in order to tune OOM killer preferences. */
  oom_score_adj?: number;
  /** If set to true, output of the container command will be printed. */
  output_logs?: boolean;
  /** Use with the started state to pause running processes inside the container. */
  paused?: boolean;
  /** Set the PID namespace mode for the container. */
  pid_mode?: string;
  /** Set PIDs limit for the container. It accepts an integer value. */
  pids_limit?: number;
  /** Platform for the container in the format C(os[/arch[/variant]]). */
  platform?: string;
  /** Give extended privileges to the container. */
  privileged?: boolean;
  /** Publish all ports to the host. */
  publish_all_ports?: boolean;
  /** List of ports to publish from the container to the host. */
  published_ports?: string | string[];
  /** If set to V(never), will never try to pull an image. Will fail if the image is not available on the Docker daemon. */
  pull?: unknown;
  /** Allows to adjust the behavior when O(pull=always) or O(pull=true) in check mode. */
  pull_check_mode_behavior?: "image_not_present" | "always";
  /** Mount the container's root file system as read-only. */
  read_only?: boolean;
  /** Use with present and started states to force the re-creation of an existing container. */
  recreate?: boolean;
  /** When removing an existing container, the docker daemon API call exists after the container is scheduled for removal. Removal usually is very fast, but it can happen that during high I/O load, removal can take longer. By default, the module will wait until the container has been removed before trying to (re-)create it, however long this takes. */
  removal_wait_timeout?: number;
  /** Use with started state to force a matching container to be stopped and restarted. */
  restart?: boolean;
  /** Container restart policy. */
  restart_policy?: "no" | "on-failure" | "always" | "unless-stopped";
  /** Use with restart policy to control maximum number of restart attempts. */
  restart_retries?: number;
  /** Runtime to use for the container. */
  runtime?: string;
  /** List of security options in the form of C("label:user:User"). */
  security_opts?: string | string[];
  /** Size of C(/dev/shm) in format C(<number>[<unit>]). Number is positive integer. Unit can be V(B) (byte), V(K) (kibibyte, 1024B), V(M) (mebibyte), V(G) (gibibyte), V(T) (tebibyte), or V(P) (pebibyte). */
  shm_size?: string;
  /** V(absent) - A container matching the specified name will be stopped and removed. Use O(force_kill) to kill the container rather than stopping it. Use O(keep_volumes) to retain anonymous volumes associated with the removed container. */
  state?: "absent" | "present" | "healthy" | "stopped" | "started";
  /** Override default signal used to stop the container. */
  stop_signal?: string;
  /** Number of seconds to wait for the container to stop before sending C(SIGKILL). When the container is created by this module, its C(StopTimeout) configuration will be set to this value. */
  stop_timeout?: number;
  /** Storage driver options for this container as a key-value mapping. */
  storage_opts?: Record<string, unknown>;
  /** Dictionary of key,value pairs. */
  sysctls?: Record<string, unknown>;
  /** The maximum amount of time in seconds to wait on a response from the API. */
  timeout?: number;
  /** Secure the connection to the API by using TLS without verifying the authenticity of the Docker host server. Note that if O(validate_certs) is set to V(true) as well, it will take precedence. */
  tls?: boolean;
  /** When verifying the authenticity of the Docker Host server, provide the expected name of the server. */
  tls_hostname?: string;
  /** Mount a tmpfs directory. */
  tmpfs?: string | string[];
  /** Allocate a pseudo-TTY. */
  tty?: boolean;
  /** List of ulimit options. A ulimit is specified as V(nofile:262144:262144). */
  ulimits?: string | string[];
  /** For SSH transports, use the C(ssh) CLI tool instead of paramiko. */
  use_ssh_client?: boolean;
  /** Sets the username or UID used and optionally the groupname or GID for the specified command. */
  user?: string;
  /** Set the user namespace mode for the container. Currently, the only valid value are V(host) and the empty string (V("")). */
  userns_mode?: string;
  /** Set the UTS namespace mode for the container. */
  uts?: string;
  /** Secure the connection to the API by using TLS and verifying the authenticity of the Docker host server. */
  validate_certs?: boolean;
  /** The container volume driver. */
  volume_driver?: string;
  /** List of volumes to mount within the container. */
  volumes?: string | string[];
  /** List of container names or IDs to get volumes from. */
  volumes_from?: string | string[];
  /** Path to the working directory. */
  working_dir?: string;
}

export interface DockerContainerReturn {
  /** Facts representing the current state of the container. Matches the docker inspection output. */
  container?: Record<string, unknown>;
  /** In case a container is started without detaching, this contains the exit code of the process in the container. */
  status?: number;
}
export const docker_container = defineRemoteModule<DockerContainerArgs, DockerContainerReturn>(spec, meta);
