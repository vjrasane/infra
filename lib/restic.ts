import { Construct } from "constructs";
import { Cron } from "cdk8s";
import { CronJob, Env, EnvValue, ISecret, Secret, Volume } from "cdk8s-plus-28";
import { BitwardenOrgSecret } from "../charts/bitwarden";

interface ResticCredentialsProps {
  readonly namespace: string;
  readonly name: string;
  readonly accessKeyIdBwSecretId: string;
  readonly accessKeySecretBwSecretId: string;
  readonly resticPasswordBwSecretId: string;
}

export class ResticCredentials extends BitwardenOrgSecret {
  constructor(scope: Construct, id: string, props: ResticCredentialsProps) {
    super(scope, id, {
      ...props,
      map: [
        {
          bwSecretId: props.accessKeyIdBwSecretId,
          secretKeyName: "AWS_ACCESS_KEY_ID",
        },
        {
          bwSecretId: props.accessKeySecretBwSecretId,
          secretKeyName: "AWS_SECRET_ACCESS_KEY",
        },
        {
          bwSecretId: props.resticPasswordBwSecretId,
          secretKeyName: "RESTIC_PASSWORD",
        },
      ],
    });
  }

  toSecret = (scope: Construct, id: string) => {
    return Secret.fromSecretName(scope, id, this.name);
  };
}

interface ResticBackupProps {
  readonly namespace: string;
  readonly name: string;
  readonly repository: string;
  readonly credentials: ISecret;
  readonly hostName: string;
  readonly volume: Volume;
  readonly schedule: Cron;
}

export class ResticBackup extends CronJob {
  constructor(scope: Construct, id: string, props: ResticBackupProps) {
    const mountPath = `/${props.hostName}`;
    super(scope, id, {
      metadata: { name: props.name, namespace: props.namespace },
      schedule: props.schedule,
      successfulJobsRetained: 1,
      failedJobsRetained: 1,
      volumes: [props.volume],
      containers: [
        {
          name: "restic",
          image: "restic/restic:latest",
          command: ["/bin/sh", "-c"],
          args: [
            `set -e
echo "Initializing restic repo (if needed)..."
restic snapshots || restic init
echo "Starting restic backup..."
restic backup --host ${props.hostName} ${mountPath}
echo "Done. Snapshots:"
restic snapshots`,
          ],
          envVariables: {
            RESTIC_REPOSITORY: EnvValue.fromValue(props.repository),
          },
          envFrom: [Env.fromSecret(props.credentials)],
          volumeMounts: [{ path: mountPath, volume: props.volume }],
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
  readonly namespace: string;
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
