import { type AnsibleModuleMeta, defineRemoteModule, type RemoteModuleSpec } from "@sensible-ts/core";

// Auto-generated from: community.docker.current_container_facts
// DO NOT EDIT — regenerate with codegen
const meta: AnsibleModuleMeta = {
  "fqcn": "community.docker.current_container_facts",
  "actionPlugin": false,
  "powershell": false,
  "rawParams": false,
  "checkMode": "full",
} as const;
const spec: RemoteModuleSpec = {
  fqcn: "community.docker.current_container_facts",
  collection: { "name": "community.docker", "version": "5.4.0" },
} as const;
export type CurrentContainerFactsArgs = Record<string, unknown>;

export interface CurrentContainerFactsReturn {
  /** Ansible facts returned by the module. */
  ansible_facts?: Record<string, unknown>;
}
export const current_container_facts = defineRemoteModule<CurrentContainerFactsArgs, CurrentContainerFactsReturn>(
  spec,
  meta,
);
