import { type AnsibleModuleMeta, defineRemoteModule, type RemoteModuleSpec } from "module-runner";

// Auto-generated from: community.docker.docker_context_info
// DO NOT EDIT — regenerate with codegen
const meta: AnsibleModuleMeta = {
  "fqcn": "community.docker.docker_context_info",
  "actionPlugin": false,
  "powershell": false,
  "rawParams": false,
  "checkMode": "full",
} as const;
const spec: RemoteModuleSpec = {
  fqcn: "community.docker.docker_context_info",
  collection: { "name": "community.docker", "version": "5.4.0" },
} as const;
export interface DockerContextInfoArgs {
  /** Override for the default context's name. */
  cli_context?: string;
  /** A specific Docker CLI context to query. */
  name?: string;
  /** If set to V(true), RV(contexts) will just contain the current context and none else. */
  only_current?: boolean;
}

export interface DockerContextInfoReturn {
  /** A list of all contexts (O(only_current=false), O(name) not specified), only the current context (O(only_current=true)), or the requested context (O(name) specified). */
  contexts?: Record<string, unknown> | Record<string, unknown>[];
  /** The name of the current Docker context. */
  current_context_name?: string;
}
export const docker_context_info = defineRemoteModule<DockerContextInfoArgs, DockerContextInfoReturn>(spec, meta);
