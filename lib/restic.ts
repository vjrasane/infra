import { Construct } from "constructs";
import { Cron } from "cdk8s";
import { CronJob, EnvValue, Volume } from "cdk8s-plus-28";
import { BitwardenOrgSecret } from "../charts/bitwarden";

interface ResticCredentialsProps {
  readonly namespace: string;
  readonly name: string;
  readonly accessKeyIdBwSecretId: string;
  readonly accessKeySecretBwSecretId: string;
  readonly resticPassowrdBwSecretId: string;
}

export class ResticCredentials extends Construct {
  public readonly secretName: string;

  constructor(scope: Construct, id: string, props: ResticCredentialsProps) {
    super(scope, id);

    this.secretName = props.name;

    new BitwardenOrgSecret(this, "secret", {
      metadata: { name: props.name, namespace: props.namespace },
      spec: {
        secretName: props.name,
        map: [
          {
            // bwSecretId: "53ed67f3-9a98-4b33-974d-b3c1016ac2e1",
            bwSecretId: props.accessKeyIdBwSecretId,
            secretKeyName: "AWS_ACCESS_KEY_ID",
          },
          {
            // bwSecretId: "6adf0a82-23c4-4906-bb68-b3c1016ad9f1",
            bwSecretId: props.accessKeySecretBwSecretId,
            secretKeyName: "AWS_SECRET_ACCESS_KEY",
          },
          {
            // bwSecretId: "31406ff6-6d88-4694-82e6-b3d400b71b05",
            bwSecretId: props.resticPassowrdBwSecretId,
            secretKeyName: "RESTIC_PASSWORD",
          },
        ],
      },
    });
  }
}

function resticEnvVariables(repository: string, credentialsSecretName: string) {
  return {
    RESTIC_REPOSITORY: EnvValue.fromValue(repository),
    RESTIC_PASSWORD: EnvValue.fromSecretValue({
      secret: { name: credentialsSecretName } as any,
      key: "RESTIC_PASSWORD",
    }),
    AWS_ACCESS_KEY_ID: EnvValue.fromSecretValue({
      secret: { name: credentialsSecretName } as any,
      key: "AWS_ACCESS_KEY_ID",
    }),
    AWS_SECRET_ACCESS_KEY: EnvValue.fromSecretValue({
      secret: { name: credentialsSecretName } as any,
      key: "AWS_SECRET_ACCESS_KEY",
    }),
  };
}

interface ResticBackupProps {
  readonly namespace: string;
  readonly name: string;
  readonly repository: string;
  readonly credentialsSecretName: string;
  readonly hostName: string;
  readonly volume: Volume;
  readonly volumeMountPath: string;
  readonly schedule: Cron;
}

export class ResticBackup extends Construct {
  constructor(scope: Construct, id: string, props: ResticBackupProps) {
    super(scope, id);

    new CronJob(this, "cronjob", {
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
restic backup --host ${props.hostName} ${props.volumeMountPath}
echo "Done. Snapshots:"
restic snapshots`,
          ],
          envVariables: resticEnvVariables(
            props.repository,
            props.credentialsSecretName,
          ),
          volumeMounts: [{ path: props.volumeMountPath, volume: props.volume }],
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
  readonly credentialsSecretName: string;
  readonly hostName: string;
  readonly schedule: Cron;
  readonly keepWeekly?: number;
  readonly keepMonthly?: number;
}

export class ResticPrune extends Construct {
  constructor(scope: Construct, id: string, props: ResticPruneProps) {
    super(scope, id);

    const keepWeekly = props.keepWeekly ?? 4;
    const keepMonthly = props.keepMonthly ?? 6;

    new CronJob(this, "cronjob", {
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
restic forget --host ${props.hostName} --keep-weekly ${keepWeekly} --keep-monthly ${keepMonthly} --prune
echo "Done. Snapshots:"
restic snapshots`,
          ],
          envVariables: resticEnvVariables(
            props.repository,
            props.credentialsSecretName,
          ),
          securityContext: {
            ensureNonRoot: false,
            readOnlyRootFilesystem: false,
          },
        },
      ],
    });
  }
}
