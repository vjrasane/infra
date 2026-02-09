import { Construct } from "constructs";
import { Cron } from "cdk8s";
import {
  ContainerProps,
  CronJob,
  CronJobProps,
  Env,
  EnvValue,
  ISecret,
  Volume,
  VolumeMount,
} from "cdk8s-plus-28";
import { BitwardenOrgSecret } from "../charts/bitwarden";
import { isNil, omitBy } from "lodash/fp";

export interface ResticRepo {
  readonly url: string;
  readonly accessKeyIdBwSecretId: string;
  readonly accessKeySecretBwSecretId: string;
  readonly resticPasswordBwSecretId: string;
}

export const B2_RESTIC_REPO = {
  url: "s3:s3.eu-central-003.backblazeb2.com/karkkinet-restic-repo",
  accessKeyIdBwSecretId: "43c2041e-177f-494d-b78a-b3d60141f01f",
  accessKeySecretBwSecretId: "98e48367-4a09-40e0-977b-b3d60141da4d",
  resticPasswordBwSecretId: "864b1fb7-6a84-4c99-8e2a-b3ec00d6fb38",
};
export const CLOUDFLARE_RESTIC_REPO = {
  url: "s3:485029190166e70f3358ab9fc87c6b4f.r2.cloudflarestorage.com/karkkinet-psql-backups",
  accessKeyIdBwSecretId: "cddf0c0b-52b1-4ca7-bdb5-b3e000f29516",
  accessKeySecretBwSecretId: "d75b4c3e-0789-41dc-986b-b3e000f276d2",
  resticPasswordBwSecretId: "538b50a8-a3e7-48bb-9e4c-b3ec00d8a18a",
};
export const ORACLE_RESTIC_REPO = {
  url: "s3:https://fr9g5xx9nd3r.compat.objectstorage.eu-frankfurt-1.oraclecloud.com/karkkinet-gitea-backups",
  accessKeyIdBwSecretId: "a46a4c87-a3cb-456f-84f2-b3e700f16f9d",
  accessKeySecretBwSecretId: "64cc6e3c-70fe-4b68-af44-b3e700f13ec9",
  resticPasswordBwSecretId: "8c07760e-5f05-44e6-930e-b3e700f4711e",
};
export const TEBI_RESTIC_REPO = {
  url: "s3:s3.tebi.io/karkkinet-backups",
  accessKeyIdBwSecretId: "97d3b928-04a6-4105-accd-b3e90100d52f",
  accessKeySecretBwSecretId: "c18331b8-cab4-4b41-8c4b-b3e90100ef23",
  resticPasswordBwSecretId: "465fa662-5061-4979-9c99-b3e901012dfa",
};
export const FILEBASE_RESTIC_REPO = {
  url: "s3:https://s3.filebase.com/karkkinet-backups",
  accessKeyIdBwSecretId: "2a3927b1-62c6-4fdc-97e8-b3ec00e90437",
  accessKeySecretBwSecretId: "c936d3e5-b166-4549-91b1-b3ec00e921c6",
  resticPasswordBwSecretId: "59b0d64e-3c4f-43d1-9473-b3ec00e93a3f",
};

interface ResticCredentialsProps {
  readonly namespace?: string;
  readonly name?: string;
  readonly repo: ResticRepo;
}

export class ResticCredentials extends BitwardenOrgSecret {
  readonly repoUrl: string;

  static resticPasswordSecretKeyName = "RESTIC_PASSWORD";
  constructor(scope: Construct, id: string, props: ResticCredentialsProps) {
    const { repo } = props;
    const {
      url,
      accessKeyIdBwSecretId,
      accessKeySecretBwSecretId,
      resticPasswordBwSecretId,
    } = repo;
    super(scope, id, {
      ...props,
      map: [
        {
          bwSecretId: accessKeyIdBwSecretId,
          secretKeyName: "AWS_ACCESS_KEY_ID",
        },
        {
          bwSecretId: accessKeySecretBwSecretId,
          secretKeyName: "AWS_SECRET_ACCESS_KEY",
        },
        {
          bwSecretId: resticPasswordBwSecretId,
          secretKeyName: ResticCredentials.resticPasswordSecretKeyName,
        },
      ],
    });

    this.repoUrl = url;
  }
}

interface PruneProps {
  keepDaily?: number;
  keepWeekly?: number;
  keepMonthly?: number;
}

interface ResticBackupProps {
  readonly namespace?: string;
  readonly name?: string;
  readonly credentials: ResticCredentials;
  readonly hostName: string;
  readonly volume: Volume;
  readonly schedule?: Cron;
  readonly initContainers?: CronJobProps["initContainers"];
  readonly prune?: PruneProps | boolean;
}

export class ResticBackup extends Construct {
  constructor(scope: Construct, id: string, props: ResticBackupProps) {
    super(scope, id);

    const { namespace } = props;
    const name = props.name ?? namespace;
    const schedule =
      props.schedule ?? Cron.schedule({ minute: "0", hour: "2" });

    let pruneCmd: string | undefined;
    if (!!props.prune) {
      const prune = typeof props.prune === "object" ? props.prune : {};
      const keeps = [
        "--keep-daily",
        prune.keepDaily ?? 7,
        "--keep-weekly",
        prune.keepWeekly ?? 4,
        "--keep-monthly",
        prune.keepMonthly ?? 6,
      ].join(" ");
      pruneCmd = `restic forget --host ${props.hostName} --group-by host,paths ${keeps}`;
    }

    const credentials = props.credentials.toSecret();
    new CronJob(this, id, {
      metadata: omitBy(isNil, { name, namespace }),
      schedule,
      successfulJobsRetained: 1,
      failedJobsRetained: 1,
      initContainers: props.initContainers,
      containers: [
        {
          name: "restic",
          image: "restic/restic:latest",
          command: ["/bin/sh", "-c"],
          args: [
            `
            set -e
            echo "Initializing restic repo (if needed)..."
            restic snapshots || restic init
            echo "Starting restic backup..."
            restic backup --host ${props.hostName} /backup
            ${pruneCmd ? pruneCmd : ""}
            echo "Done. Snapshots:"
            restic snapshots
            `,
          ],
          envVariables: {
            RESTIC_REPOSITORY: EnvValue.fromValue(props.credentials.repoUrl),
          },
          envFrom: [Env.fromSecret(credentials)],
          volumeMounts: [{ path: "/backup", volume: props.volume }],
          securityContext: {
            ensureNonRoot: false,
            readOnlyRootFilesystem: false,
          },
        },
      ],
    });
  }
}

interface ResticPruneProps {
  readonly namespace?: string;
  readonly name: string;
  readonly repository: string;
  readonly credentials: ISecret;
  readonly hostName: string;
  readonly schedule: Cron;
  readonly keepWeekly?: number;
  readonly keepMonthly?: number;
}

export class ResticPrune extends CronJob {
  constructor(scope: Construct, id: string, props: ResticPruneProps) {
    const keepWeekly = props.keepWeekly ?? 4;
    const keepMonthly = props.keepMonthly ?? 6;
    super(scope, id, {
      metadata: { name: props.name, namespace: props.namespace },
      schedule: props.schedule,
      successfulJobsRetained: 1,
      failedJobsRetained: 1,
      containers: [
        {
          name: "restic",
          image: "restic/restic:latest",
          command: ["/bin/sh", "-c"],
          args: [
            `set -e
echo "Pruning old snapshots..."
restic forget --host ${props.hostName} --group-by host,paths --keep-weekly ${keepWeekly} --keep-monthly ${keepMonthly} --prune
echo "Done. Snapshots:"
restic snapshots`,
          ],
          envVariables: {
            RESTIC_REPOSITORY: EnvValue.fromValue(props.repository),
          },
          envFrom: [Env.fromSecret(props.credentials)],
          securityContext: {
            ensureNonRoot: false,
            readOnlyRootFilesystem: false,
          },
        },
      ],
    });
  }
}

export const createSqliteVacuum = (
  dbPath: string,
  backupPath: string,
  ...volumeMounts: VolumeMount[]
): ContainerProps => ({
  image: "keinos/sqlite3:latest",
  command: ["/bin/sh", "-c"],
  args: [`sqlite3 ${dbPath} "VACUUM INTO '${backupPath}'"`],
  volumeMounts,
  securityContext: {
    ensureNonRoot: false,
    readOnlyRootFilesystem: false,
  },
});
