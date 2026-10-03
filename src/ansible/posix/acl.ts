import { type AnsibleModuleMeta, defineRemoteModule, type RemoteModuleSpec } from "@sensible-ts/core";

// Auto-generated from: ansible.posix.acl
// DO NOT EDIT — regenerate with codegen
const meta: AnsibleModuleMeta = {
  "fqcn": "ansible.posix.acl",
  "actionPlugin": false,
  "powershell": false,
  "rawParams": false,
  "checkMode": "none",
} as const;
const spec: RemoteModuleSpec = {
  fqcn: "ansible.posix.acl",
  collection: { "name": "ansible.posix", "version": "2.2.2" },
} as const;
export interface AclArgs {
  /** If O(path) is a directory, setting this to V(true) will make it the default ACL for entities created inside the directory. */
  default?: boolean;
  /** The actual user or group that the ACL applies to when matching entity types user or group are selected. */
  entity?: string;
  /** DEPRECATED. */
  entry?: string;
  /** The entity type of the ACL to apply, see C(setfacl) documentation for more info. */
  etype?: "group" | "mask" | "other" | "user";
  /** Whether to follow symlinks on the path if a symlink is encountered. */
  follow?: boolean;
  /** The full path of the file or object. */
  path: string;
  /** The permissions to apply/remove can be any combination of C(r), C(w), C(x) (read, write and execute respectively), and C(X) (execute permission if the file is a directory or already has execute permission for some user) */
  permissions?: string;
  /** Select if and when to recalculate the effective right masks of the files. */
  recalculate_mask?: "default" | "mask" | "no_mask";
  /** Recursively sets the specified ACL. */
  recursive?: boolean;
  /** Define whether the ACL should be present or not. */
  state?: "absent" | "present" | "query";
  /** Use NFSv4 ACLs instead of POSIX ACLs. */
  use_nfsv4_acls?: boolean;
}

export interface AclReturn {
  /** Current ACL on provided path (after changes, if any) */
  acl?: string | string[];
}
export const acl = defineRemoteModule<AclArgs, AclReturn>(spec, meta);
