import { readFileSync } from "node:fs";
import path from "node:path";
import { setupCronjob } from "../cronjob";

const script = readFileSync(path.join(__dirname, "restic-backup.sh"), "utf8");

export const setupResticBackup = async (
  host: string,
  dirs: string[],
  opts: {
    env?: Record<string, string>;
    hour?: string;
    immediate?: boolean;
  } = {},
) => {
  await setupCronjob("restic backup " + host, script, [host, ...dirs], {
    minute: "0",
    hour: "3",
    ...opts,
  });
};
