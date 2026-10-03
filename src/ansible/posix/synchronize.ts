import { type AnsibleModuleMeta, defineRemoteModule, type RemoteModuleSpec } from "@sensible-ts/core";

// Auto-generated from: ansible.posix.synchronize
// DO NOT EDIT — regenerate with codegen
const meta: AnsibleModuleMeta = {
  "fqcn": "ansible.posix.synchronize",
  "actionPlugin": true,
  "powershell": false,
  "rawParams": false,
  "checkMode": "none",
} as const;
const spec: RemoteModuleSpec = {
  fqcn: "ansible.posix.synchronize",
  collection: { "name": "ansible.posix", "version": "2.2.2" },
} as const;
export interface SynchronizeArgs {
  /** Internal use only, never logged. */
  _local_rsync_password?: string;
  /** Internal use only. */
  _local_rsync_path?: string;
  /** Internal use only. See O(use_ssh_args) for ssh arg settings. */
  _ssh_args?: string;
  /** Internal use only. */
  _substitute_controller?: boolean;
  /** Mirrors the rsync archive flag, enables recursive, links, perms, times, owner, group flags, and C(-D). */
  archive?: boolean;
  /** Skip based on checksum, rather than mod-time & size; Note that that O(archive) option is still enabled by default - the O(checksum) option will not disable it. */
  checksum?: boolean;
  /** Compress file data during the transfer. */
  compress?: boolean;
  /** Copy symlinks as the item that they point to (the referent) is copied, rather than the symlink. */
  copy_links?: boolean;
  /** This option puts the temporary file from each updated file into a holding directory until the end of the transfer, at which time all the files are renamed into place in rapid succession. */
  delay_updates?: boolean;
  /** Delete files in O(dest) that do not exist (after transfer, not before) in the O(src) path. */
  delete?: boolean;
  /** Path on the destination host that will be synchronized from the source. */
  dest: string;
  /** Port number for ssh on the destination host. */
  dest_port?: number;
  /** Transfer directories without recursing. */
  dirs?: boolean;
  /** Skip creating new files on receiver. */
  existing_only?: boolean;
  /** Preserve group. */
  group?: boolean;
  /** Add a destination to hard link against during the rsync. */
  link_dest?: string | string[];
  /** Copy symlinks as symlinks. */
  links?: boolean;
  /** Specify the direction of the synchronization. */
  mode?: "pull" | "push";
  /** Preserve owner (super user only). */
  owner?: boolean;
  /** Tells rsync to keep the partial file which should make a subsequent transfer of the rest of the file much faster. */
  partial?: boolean;
  /** Preserve permissions. */
  perms?: boolean;
  /** Specify the private key to use for SSH-based rsync connections (e.g. C(~/.ssh/id_rsa)). */
  private_key?: string;
  /** Recurse into directories. */
  recursive?: boolean;
  /** Specify additional rsync options by passing in an array. */
  rsync_opts?: string | string[];
  /** Specify the rsync command to run on the remote host. See C(--rsync-path) on the rsync man page. */
  rsync_path?: string;
  /** Specify a C(--timeout) for the rsync command in seconds. */
  rsync_timeout?: number;
  /** Put C(user@) for the remote paths. */
  set_remote_user?: boolean;
  /** Path on the source host that will be synchronized to the destination. */
  src: string;
  /** SSH connection multiplexing for rsync is disabled by default to prevent misconfigured ControlSockets from resulting in failed SSH connections. This is accomplished by setting the SSH C(ControlSocket) to C(none). */
  ssh_connection_multiplexing?: boolean;
  /** Preserve modification times. */
  times?: boolean;
  /** In Ansible 2.10 and lower, it uses the ssh_args specified in C(ansible.cfg). */
  use_ssh_args?: boolean;
  /** Verify destination host key. */
  verify_host?: boolean;
}

export type SynchronizeReturn = Record<string, unknown>;
export const synchronize = defineRemoteModule<SynchronizeArgs, SynchronizeReturn>(spec, meta);
