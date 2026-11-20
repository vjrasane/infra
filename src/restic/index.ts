import { setupCronjob } from "../lib/cronjob";
import { file, commonPerms as perms } from "../lib/files";
import { decryptSecrets } from "../secrets";
import scriptContent from "./restic-backup.sh";
import homelabEnc from "./restic-homelab-secrets.json";
import paperlessEnc from "./restic-paperless-secrets.json";

export type ResticBackupEnv = {
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  RESTIC_PASSWORD: string;
  RESTIC_REPOSITORY: string;
};

export const homelabResticRepo = () => decryptSecrets(homelabEnc);

export const paperlessResticRepo = () => decryptSecrets(paperlessEnc);

const scriptFile = file("/opt/restic/backup.sh", scriptContent, perms);

export const setupResticBackup = async (
  host: string,
  dirs: string[],
  env: ResticBackupEnv,
  opts: {
    hour?: string;
  } = {},
) => {
  const name = "restic backup " + host;
  const script = scriptFile.script([host, ...dirs], { env });
  const cronjob = script.cronjob(name, {
    minute: "0",
    hour: "3",
    ...opts,
  });

  await cronjob.create();
};
