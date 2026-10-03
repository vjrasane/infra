import { type AnsibleModuleMeta, defineRemoteModule, type RemoteModuleSpec } from "@sensible-ts/core";

// Auto-generated from: ansible.posix.firewalld_info
// DO NOT EDIT — regenerate with codegen
const meta: AnsibleModuleMeta = {
  "fqcn": "ansible.posix.firewalld_info",
  "actionPlugin": false,
  "powershell": false,
  "rawParams": false,
  "checkMode": "none",
} as const;
const spec: RemoteModuleSpec = {
  fqcn: "ansible.posix.firewalld_info",
  collection: { "name": "ansible.posix", "version": "2.2.2" },
} as const;
export interface FirewalldInfoArgs {
  /** Gather information about active zones. */
  active_zones?: boolean;
  /** Gather information about specific zones. */
  zones?: string | string[];
}

export interface FirewalldInfoReturn {
  /** Gather active zones only if turn it C(true). */
  active_zones?: boolean;
  /** A list of collected zones. */
  collected_zones?: string | string[];
  /** Returns various information about firewalld configuration. */
  firewalld_info?: unknown;
  /** A list of undefined zones in C(zones) option. */
  undefined_zones?: string | string[];
}
export const firewalld_info = defineRemoteModule<FirewalldInfoArgs, FirewalldInfoReturn>(spec, meta);
