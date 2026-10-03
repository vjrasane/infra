import { type AnsibleModuleMeta, defineRemoteModule, type RemoteModuleSpec } from "@sensible-ts/core";

// Auto-generated from: ansible.posix.authorized_key
// DO NOT EDIT — regenerate with codegen
const meta: AnsibleModuleMeta = {
  "fqcn": "ansible.posix.authorized_key",
  "actionPlugin": false,
  "powershell": false,
  "rawParams": false,
  "checkMode": "none",
} as const;
const spec: RemoteModuleSpec = {
  fqcn: "ansible.posix.authorized_key",
  collection: { "name": "ansible.posix", "version": "2.2.2" },
} as const;
export interface AuthorizedKeyArgs {
  /** Change the comment on the public key. */
  comment?: string;
  /** Whether to remove all other non-specified keys from the authorized_keys file. */
  exclusive?: boolean;
  /** Follow path symlink instead of replacing it. */
  follow?: boolean;
  /** The SSH public key(s), as a string or (since Ansible 1.9) url (https://github.com/username.keys). */
  key: string;
  /** A string of ssh key options to be prepended to the key in the authorized_keys file. */
  key_options?: string;
  /** Whether this module should manage the directory of the authorized key file. */
  manage_dir?: boolean;
  /** Alternative path to the authorized_keys file. */
  path?: string;
  /** Whether the given key (with the given key_options) should or should not be in the file. */
  state?: "absent" | "present";
  /** The username on the remote host whose authorized_keys file will be modified. */
  user: string;
  /** This only applies if using a https url as the source of the keys. */
  validate_certs?: boolean;
}

export interface AuthorizedKeyReturn {
  /** If the key has been forced to be exclusive or not. */
  exclusive?: boolean;
  /** The key that the module was running against. */
  key?: string;
  /** Key options related to the key. */
  key_option?: string;
  /** Path for authorized key file. */
  keyfile?: string;
  /** Whether this module managed the directory of the authorized key file. */
  manage_dir?: boolean;
  /** Alternate path to the authorized_keys file */
  path?: string;
  /** Whether the given key (with the given key_options) should or should not be in the file */
  state?: string;
  /** Whether the key is unique */
  unique?: boolean;
  /** The username on the remote host whose authorized_keys file will be modified */
  user?: string;
  /** This only applies if using a https url as the source of the keys. If set to C(false), the SSL certificates will not be validated. */
  validate_certs?: boolean;
}
export const authorized_key = defineRemoteModule<AuthorizedKeyArgs, AuthorizedKeyReturn>(spec, meta);
