import { type AnsibleModuleMeta, defineRemoteModule, type RemoteModuleSpec } from "module-runner";

// Auto-generated from: community.docker.docker_image_build
// DO NOT EDIT — regenerate with codegen
const meta: AnsibleModuleMeta = {
  "fqcn": "community.docker.docker_image_build",
  "actionPlugin": false,
  "powershell": false,
  "rawParams": false,
  "checkMode": "full",
} as const;
const spec: RemoteModuleSpec = {
  fqcn: "community.docker.docker_image_build",
  collection: { "name": "community.docker", "version": "5.4.0" },
} as const;
export interface DockerImageBuildArgs {
  /** The version of the Docker API running on the Docker Host. */
  api_version?: string;
  /** Provide a dictionary of C(key:value) build arguments that map to Dockerfile ARG directive. */
  args?: Record<string, unknown>;
  /** Use a CA certificate when performing server verification by providing the path to a CA certificate file. */
  ca_path?: string;
  /** List of image names to consider as cache source. */
  cache_from?: string | string[];
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
  /** Provide an alternate name for the Dockerfile to use when building an image. */
  dockerfile?: string;
  /** Extra hosts to add to C(/etc/hosts) in building containers, as a mapping of hostname to IP address. */
  etc_hosts?: Record<string, unknown>;
  /** Dictionary of key value pairs. */
  labels?: Record<string, unknown>;
  /** Image name. Name format will be one of: C(name), C(repository/name), C(registry_server:port/name). When pushing or pulling an image the name can optionally include the tag by appending C(:tag_name). */
  name: string;
  /** The network to use for C(RUN) build instructions. */
  network?: string;
  /** Do not use cache when building an image. */
  nocache?: boolean;
  /** Output destinations. */
  outputs?: Record<string, unknown> | Record<string, unknown>[];
  /** The path for the build environment. */
  path: string;
  /** Platforms in the format C(os[/arch[/variant]]). */
  platform?: string | string[];
  /** When building an image downloads any updates to the FROM image in Dockerfile. */
  pull?: boolean;
  /** Defines the behavior of the module if the image to build (as specified in O(name) and O(tag)) already exists. */
  rebuild?: "never" | "always";
  /** Secrets to expose to the build. */
  secrets?: Record<string, unknown> | Record<string, unknown>[];
  /** Size of C(/dev/shm) in format C(<number>[<unit>]). Number is positive integer. Unit can be V(B) (byte), V(K) (kibibyte, 1024B), V(M) (mebibyte), V(G) (gibibyte), V(T) (tebibyte), or V(P) (pebibyte). */
  shm_size?: string;
  /** Tag for the image name O(name) that is to be tagged. */
  tag?: string;
  /** When building an image specifies an intermediate build stage by name as a final stage for the resulting image. */
  target?: string;
  /** Secure the connection to the API by using TLS without verifying the authenticity of the Docker host server. Note that if O(validate_certs) is set to V(true) as well, it will take precedence. */
  tls?: boolean;
  /** When verifying the authenticity of the Docker Host server, provide the expected name of the server. */
  tls_hostname?: string;
  /** Secure the connection to the API by using TLS and verifying the authenticity of the Docker host server. */
  validate_certs?: boolean;
}

export interface DockerImageBuildReturn {
  /** The command executed. */
  command?: string | string[];
  /** Image inspection results for the affected image. */
  image?: Record<string, unknown>;
}
export const docker_image_build = defineRemoteModule<DockerImageBuildArgs, DockerImageBuildReturn>(spec, meta);
