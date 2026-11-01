import { type AnsibleModuleMeta, defineRemoteModule, type RemoteModuleSpec } from "module-runner";

// Auto-generated from: community.docker.docker_image
// DO NOT EDIT — regenerate with codegen
const meta: AnsibleModuleMeta = {
  "fqcn": "community.docker.docker_image",
  "actionPlugin": false,
  "powershell": false,
  "rawParams": false,
  "checkMode": "partial",
} as const;
const spec: RemoteModuleSpec = {
  fqcn: "community.docker.docker_image",
  collection: { "name": "community.docker", "version": "5.4.0" },
} as const;
export interface DockerImageArgs {
  /** The version of the Docker API running on the Docker Host. */
  api_version?: string;
  /** Use with O(state=present) to archive an image to a C(.tar) file. */
  archive_path?: string;
  /** Specifies options used for building images. */
  build?: {
    args?: Record<string, unknown>;
    cache_from?: string | string[];
    container_limits?: { cpusetcpus?: string; cpushares?: number; memory?: string; memswap?: string };
    dockerfile?: string;
    etc_hosts?: Record<string, unknown>;
    http_timeout?: number;
    labels?: Record<string, unknown>;
    network?: string;
    nocache?: boolean;
    path: string;
    platform?: string;
    pull?: boolean;
    rm?: boolean;
    shm_size?: string;
    target?: string;
    use_config_proxy?: boolean;
  };
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
  /** Use with O(state=absent) to un-tag and remove all images matching the specified name. */
  force_absent?: boolean;
  /** Use with O(state=present) to build, load or pull an image (depending on the value of the O(source) option) when the image already exists. */
  force_source?: boolean;
  /** Use with O(state=present) to force tagging an image. */
  force_tag?: boolean;
  /** Use with O(state=present) to load an image from a C(.tar) file. */
  load_path?: string;
  /** Image name. Name format will be one of: C(name), C(repository/name), C(registry_server:port/name). When pushing or pulling an image the name can optionally include the tag by appending C(:tag_name). */
  name: string;
  /** Specifies options used for pulling images. */
  pull?: { platform?: string };
  /** Push the image to the registry. Specify the registry as part of the O(name) or O(repository) parameter. */
  push?: boolean;
  /** Use with O(state=present) to tag the image. */
  repository?: string;
  /** Determines where the module will try to retrieve the image from. */
  source?: "build" | "load" | "pull" | "local";
  /** Make assertions about the state of an image. */
  state?: "absent" | "present";
  /** Used to select an image when pulling. Will be added to the image when pushing, tagging or building. Defaults to V(latest). */
  tag?: string;
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

export interface DockerImageReturn {
  /** Image inspection results for the affected image. */
  image?: Record<string, unknown>;
  /** Docker build output when building an image. */
  stdout?: string;
}
export const docker_image = defineRemoteModule<DockerImageArgs, DockerImageReturn>(spec, meta);
