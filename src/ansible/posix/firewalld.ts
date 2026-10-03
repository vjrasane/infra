import { type AnsibleModuleMeta, defineRemoteModule, type RemoteModuleSpec } from "@sensible-ts/core";

// Auto-generated from: ansible.posix.firewalld
// DO NOT EDIT — regenerate with codegen
const meta: AnsibleModuleMeta = {
  "fqcn": "ansible.posix.firewalld",
  "actionPlugin": false,
  "powershell": false,
  "rawParams": false,
  "checkMode": "none",
} as const;
const spec: RemoteModuleSpec = {
  fqcn: "ansible.posix.firewalld",
  collection: { "name": "ansible.posix", "version": "2.2.2" },
} as const;
export interface FirewalldArgs {
  /** The forward setting you would like to enable/disable to/from zones within firewalld. */
  forward?: boolean;
  /** The ICMP block you would like to add/remove to/from a zone in firewalld. */
  icmp_block?: string;
  /** Enable/Disable inversion of ICMP blocks for a zone in firewalld. */
  icmp_block_inversion?: boolean;
  /** Whether to apply this change to the runtime firewalld configuration. */
  immediate?: boolean;
  /** The interface you would like to add/remove to/from a zone in firewalld. */
  interface?: string;
  /** The masquerade setting you would like to enable/disable to/from zones within firewalld. */
  masquerade?: boolean;
  /** Ignores O(immediate) if O(permanent=true) and firewalld is not running. */
  offline?: boolean;
  /** Whether to apply this change to the permanent firewalld configuration. */
  permanent?: boolean;
  /** Name of a port or port range to add/remove to/from firewalld. */
  port?: string;
  /** Port and protocol to forward using firewalld. */
  port_forward?: Record<string, unknown> | Record<string, unknown>[];
  /** Name of a protocol to add/remove to/from firewalld. */
  protocol?: string;
  /** Rich rule to add/remove to/from firewalld. */
  rich_rule?: string;
  /** Name of a service to add/remove to/from firewalld. */
  service?: string;
  /** The source/network you would like to add/remove to/from firewalld. */
  source?: string;
  /** Enable or disable a setting. */
  state: "absent" | "disabled" | "enabled" | "present";
  /** firewalld Zone target. */
  target?: "default" | "ACCEPT" | "DROP" | "%%REJECT%%";
  /** The amount of time in seconds the rule should be in effect for when non-permanent. */
  timeout?: number;
  /** The firewalld zone to add/remove to/from. */
  zone?: string;
}

export type FirewalldReturn = Record<string, unknown>;
export const firewalld = defineRemoteModule<FirewalldArgs, FirewalldReturn>(spec, meta);
