import { type AnsibleModuleMeta, defineRemoteModule, type RemoteModuleSpec } from "module-runner";

// Auto-generated from: ansible.posix.patch
// DO NOT EDIT — regenerate with codegen
const meta: AnsibleModuleMeta = {
  "fqcn": "ansible.posix.patch",
  "actionPlugin": true,
  "powershell": false,
  "rawParams": false,
  "checkMode": "none",
} as const;
const spec: RemoteModuleSpec = {
  fqcn: "ansible.posix.patch",
  collection: { "name": "ansible.posix", "version": "2.2.2" },
} as const;
export interface PatchArgs {
  /** Passes C(--backup --version-control=numbered) to patch, producing numbered backup copies. */
  backup?: boolean;
  /** Path of a base directory in which the patch file will be applied. */
  basedir?: string;
  /** Setting to V(true) will disable patch's heuristic for transforming CRLF line endings into LF. */
  binary?: boolean;
  /** Path of the file on the remote machine to be patched. */
  dest?: string;
  /** Setting to V(true) will ignore white space changes between patch and input. */
  ignore_whitespace?: boolean;
  /** If V(false), it will search for src at originating/controller machine, */
  remote_src?: boolean;
  /** Path of the patch file as accepted by the GNU patch tool. If O(remote_src=false), the patch source file is looked up from the module's I(files) directory. */
  src: string;
  /** Whether the patch should be applied or reverted. */
  state?: "absent" | "present";
  /** Number that indicates the smallest prefix containing leading slashes that will be stripped from each file name found in the patch file. */
  strip?: number;
}

export type PatchReturn = Record<string, unknown>;
export const patch = defineRemoteModule<PatchArgs, PatchReturn>(spec, meta);
