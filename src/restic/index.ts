import { decryptSecrets } from "../secrets";
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
