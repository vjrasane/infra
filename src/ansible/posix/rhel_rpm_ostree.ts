import { type AnsibleModuleMeta, defineRemoteModule, type RemoteModuleSpec } from "module-runner";

// Auto-generated from: ansible.posix.rhel_rpm_ostree
// DO NOT EDIT — regenerate with codegen
const meta: AnsibleModuleMeta = {
  "fqcn": "ansible.posix.rhel_rpm_ostree",
  "actionPlugin": false,
  "powershell": false,
  "rawParams": false,
  "checkMode": "none",
} as const;
const spec: RemoteModuleSpec = {
  fqcn: "ansible.posix.rhel_rpm_ostree",
  collection: { "name": "ansible.posix", "version": "2.2.2" },
} as const;
export interface RhelRpmOstreeArgs {
  /** A package name or package specifier with version, like V(name-1.0). */
  name?: string | string[];
  /** Whether to install (V(present) or V(installed), V(latest)), or remove (V(absent) or V(removed)) a package. */
  state?: "absent" | "installed" | "latest" | "present" | "removed";
}

export interface RhelRpmOstreeReturn {
  /** status of rpm transaction */
  msg?: string;
}
export const rhel_rpm_ostree = defineRemoteModule<RhelRpmOstreeArgs, RhelRpmOstreeReturn>(spec, meta);
