import { Construct } from "constructs";
import { Cron } from "cdk8s";
import { CronJob, Env, EnvValue, Volume } from "cdk8s-plus-28";
import { CLOUDFLARE_RESTIC_REPO, ResticCredentials } from "./restic";
import { PostgresCredentials } from "./postgres";

interface PostgresBackupProps {
  readonly namespace?: string;
  readonly name?: string;
  /** PostgreSQL service hostname */
  readonly postgresHost: EnvValue;

  readonly postgresCredentials: PostgresCredentials;

  /** Backup schedule (default: 2 AM daily) */
  readonly backupSchedule?: Cron;
  /** Retention policy */
  readonly keepDaily?: number;
  readonly keepWeekly?: number;
  readonly keepMonthly?: number;
}

export class PostgresBackup extends Construct {
  constructor(scope: Construct, id: string, props: PostgresBackupProps) {
    super(scope, id);

    const {
      namespace,
      postgresHost,
      postgresCredentials,
      backupSchedule = Cron.schedule({ minute: "0", hour: "2" }),
      keepDaily = 7,
      keepWeekly = 4,
      keepMonthly = 6,
    } = props;

    let name;
    if (props.name) name = props.name;
    else if (namespace) name = namespace + "-postgres-backup";

    const resticCredentialsName = `${name}-restic-credentials`; // pragma: allowlist secret
    const credentials = new ResticCredentials(this, "restic-credentials", {
      name: resticCredentialsName,
      repo: CLOUDFLARE_RESTIC_REPO,
    });

    const hostName = postgresHost;
    const backupVolume = Volume.fromEmptyDir(
      this,
      "backup-volume",
      "backup-data",
    );
    const resticSecret = credentials.toSecret();

    // Daily backup CronJob
    // Init container: pg_dump to emptyDir
    // Main container: restic backup to remote
    new CronJob(this, "backup", {
      metadata: { name: `${name}-backup`, namespace },
      schedule: backupSchedule,
      successfulJobsRetained: 1,
      failedJobsRetained: 1,
      volumes: [backupVolume],
      initContainers: [
        {
          name: "pg-dump",
          image: "postgres:17-alpine",
          command: ["/bin/sh", "-c"],
          args: [
            `set -e
DATE=$(date +%Y-%m-%d)
echo "Starting pg_dump for $DATE..."
PGPASSWORD=$PGPASSWORD pg_dump -h ${postgresHost.value} -U ${postgresCredentials.user.value} -d ${postgresCredentials.database.value} > /backups/daily-$DATE.sql
echo "Backup complete:"
ls -la /backups/`,
          ],
          envVariables: {
            PGPASSWORD: postgresCredentials.password,
          },
          volumeMounts: [{ path: "/backups", volume: backupVolume }],
          securityContext: { ensureNonRoot: false },
        },
      ],
      containers: [
        {
          name: "restic-backup",
          image: "restic/restic:latest",
          command: ["/bin/sh", "-c"],
          args: [
            `set -e
echo "Initializing restic repo (if needed)..."
restic snapshots || restic init
echo "Starting restic backup..."
restic backup --host ${hostName} /backups
echo "Backup complete. Pruning old snapshots..."
restic forget --host ${hostName} --keep-daily ${keepDaily} --keep-weekly ${keepWeekly} --keep-monthly ${keepMonthly} --prune
echo "Done. Current snapshots:"
restic snapshots`,
          ],
          envVariables: {
            RESTIC_REPOSITORY: EnvValue.fromValue(credentials.repoUrl),
          },
          envFrom: [Env.fromSecret(resticSecret)],
          volumeMounts: [{ path: "/backups", volume: backupVolume }],
          securityContext: {
            ensureNonRoot: false,
            readOnlyRootFilesystem: false,
          },
        },
      ],
    });

    // Suspended restore job - trigger manually with:
    // kubectl create job --from=cronjob/<name>-restore -n <namespace> <name>-restore-manual
    const restoreVolume = Volume.fromEmptyDir(
      this,
      "restore-volume",
      "restore-data",
    );
    new CronJob(this, "restore", {
      metadata: { name: `${name}-restore`, namespace },
      schedule: Cron.schedule({ minute: "0", hour: "0", day: "1", month: "1" }),
      suspend: true,
      successfulJobsRetained: 1,
      failedJobsRetained: 1,
      volumes: [restoreVolume],
      initContainers: [
        {
          name: "restic-restore",
          image: "restic/restic:latest",
          command: ["/bin/sh", "-c"],
          args: [
            `set -e
echo "Restoring latest snapshot from restic..."
restic restore latest --target /restore --host ${hostName}
echo "Restore complete. Available backups:"
ls -la /restore/backups/`,
          ],
          envVariables: {
            RESTIC_REPOSITORY: EnvValue.fromValue(credentials.repoUrl),
          },
          envFrom: [Env.fromSecret(resticSecret)],
          volumeMounts: [{ path: "/restore", volume: restoreVolume }],
          securityContext: {
            ensureNonRoot: false,
            readOnlyRootFilesystem: false,
          },
        },
      ],
      containers: [
        {
          name: "psql-import",
          image: "postgres:17-alpine",
          command: ["/bin/sh", "-c"],
          args: [
            `set -e
echo "Finding latest backup..."
LATEST=$(ls -t /restore/backups/*.sql 2>/dev/null | head -1)
if [ -z "$LATEST" ]; then
  echo "No SQL backup found!"
  exit 1
fi
echo "Importing $LATEST into ${postgresCredentials.database.value}..."
PGPASSWORD=$PGPASSWORD psql -h ${postgresHost.value} -U ${postgresCredentials.user.value} -d ${postgresCredentials.database.value} -f "$LATEST"
echo "Import complete."`,
          ],
          envVariables: {
            PGPASSWORD: postgresCredentials.password,
          },
          volumeMounts: [{ path: "/restore", volume: restoreVolume }],
          securityContext: {
            ensureNonRoot: false,
            readOnlyRootFilesystem: false,
          },
        },
      ],
    });
  }
}
