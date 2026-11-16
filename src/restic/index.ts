import { decryptSecrets } from "../secrets";
import homelabEnc from "./restic-homelab-secrets.json";
import paperlessEnc from "./restic-paperless-secrets.json";
import { setupCronjob } from "../lib/cronjob";
import script from "./restic-backup.sh";

export type ResticBackupEnv = {
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  RESTIC_PASSWORD: string;
  RESTIC_REPOSITORY: string;
};

export const homelabResticRepo = () => decryptSecrets(homelabEnc);

export const paperlessResticRepo = () => decryptSecrets(paperlessEnc);

export const setupResticBackup = async (
  host: string,
  dirs: string[],
  env: ResticBackupEnv,
  opts: {
    hour?: string;
    immediate?: boolean;
  } = {},
) => {
  await setupCronjob("restic backup " + host, script, [host, ...dirs], {
    minute: "0",
    hour: "3",
    env,
    ...opts,
  });
};
