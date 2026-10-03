import { type AnsibleModuleMeta, defineRemoteModule, type RemoteModuleSpec } from "@sensible-ts/core";

// Auto-generated from: ansible.posix.rpm_ostree_upgrade
// DO NOT EDIT — regenerate with codegen
const meta: AnsibleModuleMeta = {
  "fqcn": "ansible.posix.rpm_ostree_upgrade",
  "actionPlugin": false,
  "powershell": false,
  "rawParams": false,
  "checkMode": "none",
} as const;
const spec: RemoteModuleSpec = {
  fqcn: "ansible.posix.rpm_ostree_upgrade",
  collection: { "name": "ansible.posix", "version": "2.2.2" },
} as const;
export interface RpmOstreeUpgradeArgs {
  /** Allow for the upgrade to be a chronologically older tree. */
  allow_downgrade?: boolean;
  /** Perform the transaction using only pre-cached data, do not download. */
  cache_only?: boolean;
  /** The OSNAME upon which to operate. */
  os?: string;
  /** Force peer-to-peer connection instead of using a system message bus. */
  peer?: boolean;
}

export interface RpmOstreeUpgradeReturn {
  /** The command standard output */
  msg?: string;
}
export const rpm_ostree_upgrade = defineRemoteModule<RpmOstreeUpgradeArgs, RpmOstreeUpgradeReturn>(spec, meta);
