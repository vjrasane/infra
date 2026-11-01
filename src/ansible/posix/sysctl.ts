import { type AnsibleModuleMeta, defineRemoteModule, type RemoteModuleSpec } from "module-runner";

// Auto-generated from: ansible.posix.sysctl
// DO NOT EDIT — regenerate with codegen
const meta: AnsibleModuleMeta = {
  "fqcn": "ansible.posix.sysctl",
  "actionPlugin": false,
  "powershell": false,
  "rawParams": false,
  "checkMode": "full",
} as const;
const spec: RemoteModuleSpec = {
  fqcn: "ansible.posix.sysctl",
  collection: { "name": "ansible.posix", "version": "2.2.2" },
} as const;
export interface SysctlArgs {
  /** Use this option to ignore errors about unknown keys. */
  ignoreerrors?: boolean;
  /** The dot-separated path (also known as O(key)) specifying the sysctl variable. */
  name: string;
  /** If V(true), performs a C(/sbin/sysctl -p) if the O(sysctl_file) is updated. If V(false), does not reload C(sysctl) even if the O(sysctl_file) is updated. */
  reload?: boolean;
  /** Whether the entry should be present or absent in the sysctl file. */
  state?: "present" | "absent";
  /** Specifies the absolute path to C(sysctl.conf), if not C(/etc/sysctl.conf). */
  sysctl_file?: string;
  /** Verify token value with the sysctl command and set with C(-w) if necessary. */
  sysctl_set?: boolean;
  /** Desired value of the sysctl key. */
  value?: string;
}

export type SysctlReturn = Record<string, unknown>;
export const sysctl = defineRemoteModule<SysctlArgs, SysctlReturn>(spec, meta);
