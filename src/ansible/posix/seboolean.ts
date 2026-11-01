import { type AnsibleModuleMeta, defineRemoteModule, type RemoteModuleSpec } from "module-runner";

// Auto-generated from: ansible.posix.seboolean
// DO NOT EDIT — regenerate with codegen
const meta: AnsibleModuleMeta = {
  "fqcn": "ansible.posix.seboolean",
  "actionPlugin": false,
  "powershell": false,
  "rawParams": false,
  "checkMode": "none",
} as const;
const spec: RemoteModuleSpec = {
  fqcn: "ansible.posix.seboolean",
  collection: { "name": "ansible.posix", "version": "2.2.2" },
} as const;
export interface SebooleanArgs {
  /** Useful for scenarios (chrooted environment) that you can't get the real SELinux state. */
  ignore_selinux_state?: boolean;
  /** Name of the boolean to configure. */
  name: string;
  /** Set to V(true) if the boolean setting should survive a reboot. */
  persistent?: boolean;
  /** Desired boolean value. */
  state: boolean;
}

export type SebooleanReturn = Record<string, unknown>;
export const seboolean = defineRemoteModule<SebooleanArgs, SebooleanReturn>(spec, meta);
