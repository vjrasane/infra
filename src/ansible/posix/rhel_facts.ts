import { type AnsibleModuleMeta, defineRemoteModule, type RemoteModuleSpec } from "module-runner";

// Auto-generated from: ansible.posix.rhel_facts
// DO NOT EDIT — regenerate with codegen
const meta: AnsibleModuleMeta = {
  "fqcn": "ansible.posix.rhel_facts",
  "actionPlugin": false,
  "powershell": false,
  "rawParams": false,
  "checkMode": "none",
} as const;
const spec: RemoteModuleSpec = {
  fqcn: "ansible.posix.rhel_facts",
  collection: { "name": "ansible.posix", "version": "2.2.2" },
} as const;
export type RhelFactsArgs = Record<string, unknown>;

export interface RhelFactsReturn {
  /** Relevant Ansible Facts */
  ansible_facts?: unknown;
}
export const rhel_facts = defineRemoteModule<RhelFactsArgs, RhelFactsReturn>(spec, meta);
