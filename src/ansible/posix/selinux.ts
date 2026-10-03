import { type AnsibleModuleMeta, defineRemoteModule, type RemoteModuleSpec } from "@sensible-ts/core";

// Auto-generated from: ansible.posix.selinux
// DO NOT EDIT — regenerate with codegen
const meta: AnsibleModuleMeta = {
  "fqcn": "ansible.posix.selinux",
  "actionPlugin": false,
  "powershell": false,
  "rawParams": false,
  "checkMode": "none",
} as const;
const spec: RemoteModuleSpec = {
  fqcn: "ansible.posix.selinux",
  collection: { "name": "ansible.posix", "version": "2.2.2" },
} as const;
export interface SelinuxArgs {
  /** The path to the SELinux configuration file, if non-standard. */
  configfile?: string;
  /** The name of the SELinux policy to use (e.g. C(targeted)) will be required unless O(state=disabled). */
  policy?: string;
  /** The SELinux mode. */
  state: "disabled" | "enforcing" | "permissive";
  /** If set to V(true), will update also the kernel boot parameters when disabling/enabling SELinux. */
  update_kernel_param?: boolean;
}

export interface SelinuxReturn {
  /** Path to SELinux configuration file. */
  configfile?: string;
  /** Messages that describe changes that were made. */
  msg?: string;
  /** Name of the SELinux policy. */
  policy?: string;
  /** Whether or not an reboot is required for the changes to take effect. */
  reboot_required?: boolean;
  /** SELinux mode. */
  state?: string;
}
export const selinux = defineRemoteModule<SelinuxArgs, SelinuxReturn>(spec, meta);
