import { type AnsibleModuleMeta, defineRemoteModule, type RemoteModuleSpec } from "module-runner";

// Auto-generated from: community.docker.docker_image_remove
// DO NOT EDIT — regenerate with codegen
const meta: AnsibleModuleMeta = {
  "fqcn": "community.docker.docker_image_remove",
  "actionPlugin": false,
  "powershell": false,
  "rawParams": false,
  "checkMode": "full",
} as const;
const spec: RemoteModuleSpec = {
  fqcn: "community.docker.docker_image_remove",
  collection: { "name": "community.docker", "version": "5.4.0" },
} as const;
export interface DockerImageRemoveArgs {
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
  /** Un-tag and remove all images matching the specified name. */
  force?: boolean;
  /** Image name. Name format will be one of: C(name), C(repository/name), C(registry_server:port/name). When pushing or pulling an image the name can optionally include the tag by appending C(:tag_name). */
  name: string;
  /** Delete untagged parent images. */
  prune?: boolean;
  /** Tag for the image name O(name) that is to be tagged. */
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

export interface DockerImageRemoveReturn {
  /** The digests of the images that were deleted. */
  deleted?: string | string[];
  /** Image inspection results for the affected image before removal. */
  image?: Record<string, unknown>;
  /** The digests of the images that were untagged. */
  untagged?: string | string[];
}
export const docker_image_remove = defineRemoteModule<DockerImageRemoveArgs, DockerImageRemoveReturn>(spec, meta);
