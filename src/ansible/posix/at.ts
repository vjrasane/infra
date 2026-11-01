import { type AnsibleModuleMeta, defineRemoteModule, type RemoteModuleSpec } from "module-runner";

// Auto-generated from: ansible.posix.at
// DO NOT EDIT — regenerate with codegen
const meta: AnsibleModuleMeta = {
  "fqcn": "ansible.posix.at",
  "actionPlugin": false,
  "powershell": false,
  "rawParams": false,
  "checkMode": "none",
} as const;
const spec: RemoteModuleSpec = {
  fqcn: "ansible.posix.at",
  collection: { "name": "ansible.posix", "version": "2.2.2" },
} as const;
export interface AtArgs {
  /** A command to be executed in the future. */
  command?: string;
  /** The count of units in the future to execute the command or script file. */
  count?: number;
  /** An existing script file to be executed in the future. */
  script_file?: string;
  /** The state dictates if the command or script file should be evaluated as V(present) (added) or V(absent) (deleted). */
  state?: "absent" | "present";
  /** If a matching job is present a new job will not be added. */
  unique?: boolean;
  /** The type of units in the future to execute the command or script file. */
  units?: "minutes" | "hours" | "days" | "weeks";
}

export type AtReturn = Record<string, unknown>;
export const at = defineRemoteModule<AtArgs, AtReturn>(spec, meta);
