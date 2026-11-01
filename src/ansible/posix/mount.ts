import { type AnsibleModuleMeta, defineRemoteModule, type RemoteModuleSpec } from "module-runner";

// Auto-generated from: ansible.posix.mount
// DO NOT EDIT — regenerate with codegen
const meta: AnsibleModuleMeta = {
  "fqcn": "ansible.posix.mount",
  "actionPlugin": false,
  "powershell": false,
  "rawParams": false,
  "checkMode": "none",
} as const;
const spec: RemoteModuleSpec = {
  fqcn: "ansible.posix.mount",
  collection: { "name": "ansible.posix", "version": "2.2.2" },
} as const;
export interface MountArgs {
  /** Create a backup file including the timestamp information so you can get the original file back if you somehow clobbered it incorrectly. */
  backup?: boolean;
  /** Determines if the filesystem should be mounted on boot. */
  boot?: boolean;
  /** Dump (see fstab(5)). */
  dump?: string;
  /** File to use instead of C(/etc/fstab). */
  fstab?: string;
  /** Filesystem type. */
  fstype?: string;
  /** Mount options (see fstab(5), or vfstab(4) on Solaris). */
  opts?: string;
  /** Do not log opts. */
  opts_no_log?: boolean;
  /** Passno (see fstab(5)). */
  passno?: string;
  /** Path to the mount point (e.g. C(/mnt/files)). */
  path: string;
  /** Device (or NFS volume, or something else) to be mounted on I(path). */
  src?: string;
  /** If V(mounted), the device will be actively mounted and appropriately configured in I(fstab). If the mount point is not present, the mount point will be created. */
  state: "absent" | "absent_from_fstab" | "mounted" | "present" | "unmounted" | "remounted" | "ephemeral";
}

export type MountReturn = Record<string, unknown>;
export const mount = defineRemoteModule<MountArgs, MountReturn>(spec, meta);
