import { Construct } from "constructs";
import { ChartProps, Size, Cron } from "cdk8s";
import {
  Namespace,
  StatefulSet,
  Deployment,
  EnvValue,
  Env,
  Volume,
  Cpu,
  ConfigMap,
  CronJob,
  Service,
  Protocol,
  Secret,
} from "cdk8s-plus-28";
import { Certificate } from "../imports/cert-manager.io";
import {
  IngressRoute,
  IngressRouteSpecRoutesKind,
  IngressRouteSpecRoutesServicesKind,
  IngressRouteSpecRoutesServicesPort,
} from "../imports/traefik.io";
import { BitwardenAuthTokenChart, BitwardenOrgSecret } from "./bitwarden";
import { ResticCredentials } from "../lib/restic";
import { LocalPathPvc } from "../lib/local-path";

interface PostgresChartProps extends ChartProps {
  readonly hosts: string[];
  readonly clusterIssuerName: string;
  readonly resticRepository: string;
}

export class PostgresChart extends BitwardenAuthTokenChart {
  public readonly serviceHost: string;

  constructor(scope: Construct, id: string, props: PostgresChartProps) {
    const namespace = "postgres";
    super(scope, id, { ...props, namespace });

    new Namespace(this, "namespace", {
      metadata: { name: namespace },
    });

    // Shared credentials from Bitwarden (used by both PostgreSQL and pgAdmin)
    const credentialsSecretName = "postgres-credentials"; // pragma: allowlist secret
    new BitwardenOrgSecret(this, "credentials-secret", {
      metadata: { name: credentialsSecretName, namespace },
      spec: {
        secretName: credentialsSecretName,
        map: [
          {
            bwSecretId: "8fb3f8c0-41a0-464c-a486-b3bf0130ad72",
            secretKeyName: "password", // pragma: allowlist secret
          },
        ],
      },
    });

    const dataVolume = new LocalPathPvc(this, "data-pvc", {
      name: "postgres-data",
      namespace,
      size: Size.gibibytes(10),
    }).toVolume("data-volume");

    // Headless service for StatefulSet (fixed name)
    const serviceName = "postgres";
    const podLabels = { "app.kubernetes.io/name": "postgres" };
    const postgresService = new Service(this, "postgres-service", {
      metadata: { name: serviceName, namespace, labels: podLabels },
      clusterIP: "None",
      ports: [{ port: 5432, protocol: Protocol.TCP }],
    });
    postgresService.selectLabel("app.kubernetes.io/name", "postgres");

    // PostgreSQL StatefulSet
    new StatefulSet(this, "postgres", {
      metadata: { name: "postgres", namespace, labels: podLabels },
      service: postgresService,
      podMetadata: { labels: podLabels },
      replicas: 1,
      volumes: [dataVolume],
      containers: [
        {
          name: "postgres",
          image: "postgres:17-alpine",
          portNumber: 5432,
          envVariables: {
            POSTGRES_USER: EnvValue.fromValue("postgres"),
            POSTGRES_PASSWORD: EnvValue.fromSecretValue({
              secret: { name: credentialsSecretName } as any,
              key: "password",
            }),
            PGDATA: EnvValue.fromValue("/var/lib/postgresql/data/pgdata"),
          },
          volumeMounts: [
            { path: "/var/lib/postgresql/data", volume: dataVolume },
          ],
          securityContext: {
            ensureNonRoot: false,
            readOnlyRootFilesystem: false,
          },
          resources: {
            memory: {
              request: Size.mebibytes(256),
              limit: Size.mebibytes(512),
            },
            cpu: { request: Cpu.millis(250), limit: Cpu.millis(500) },
          },
        },
      ],
    });

    this.serviceHost = `${serviceName}.${namespace}.svc.cluster.local`;

    // pgAdmin server configuration
    const serversConfig = new ConfigMap(this, "pgadmin-servers", {
      metadata: { name: "pgadmin-servers", namespace },
      data: {
        "servers.json": JSON.stringify({
          Servers: {
            "1": {
              Name: "PostgreSQL",
              Group: "Servers",
              Host: serviceName,
              Port: 5432,
              MaintenanceDB: "postgres",
              Username: "postgres",
              SSLMode: "prefer",
            },
          },
        }),
      },
    });
    const serversVolume = Volume.fromConfigMap(
      this,
      "servers-volume",
      serversConfig,
      { name: "servers" },
    );

    // pgAdmin Deployment
    const pgadminDataVolume = Volume.fromEmptyDir(
      this,
      "pgadmin-data",
      "pgadmin-data",
    );

    const pgadminDeployment = new Deployment(this, "pgadmin", {
      metadata: {
        name: "pgadmin",
        namespace,
        labels: { "app.kubernetes.io/name": "pgadmin" },
      },
      podMetadata: { labels: { "app.kubernetes.io/name": "pgadmin" } },
      replicas: 1,
      securityContext: { fsGroup: 5050 },
      volumes: [pgadminDataVolume, serversVolume],
      containers: [
        {
          name: "pgadmin",
          image: "dpage/pgadmin4:latest",
          portNumber: 80,
          envVariables: {
            PGADMIN_DEFAULT_EMAIL: EnvValue.fromValue("admin@home.karkki.org"),
            PGADMIN_DEFAULT_PASSWORD: EnvValue.fromSecretValue({
              secret: { name: credentialsSecretName } as any,
              key: "password",
            }),
            PGADMIN_SERVER_JSON_FILE: EnvValue.fromValue(
              "/pgadmin4/servers.json",
            ),
          },
          securityContext: {
            ensureNonRoot: false,
            readOnlyRootFilesystem: false,
            allowPrivilegeEscalation: true,
          },
          volumeMounts: [
            { path: "/var/lib/pgadmin", volume: pgadminDataVolume },
            {
              path: "/pgadmin4/servers.json",
              volume: serversVolume,
              subPath: "servers.json",
            },
          ],
          resources: {
            memory: {
              request: Size.mebibytes(256),
              limit: Size.mebibytes(512),
            },
          },
        },
      ],
    });

    const pgadminService = pgadminDeployment.exposeViaService();

    // TLS Certificate
    const certSecretName = "pgadmin-tls"; // pragma: allowlist secret
    new Certificate(this, "cert", {
      metadata: { name: "pgadmin-tls", namespace },
      spec: {
        secretName: certSecretName,
        issuerRef: { name: props.clusterIssuerName, kind: "ClusterIssuer" },
        dnsNames: props.hosts,
      },
    });

    // IngressRoute for pgAdmin
    new IngressRoute(this, "ingress", {
      metadata: {
        name: "pgadmin",
        namespace,
        annotations: {
          "gethomepage.dev/enabled": "true",
          "gethomepage.dev/name": "pgAdmin",
          "gethomepage.dev/description": "PostgreSQL Admin",
          "gethomepage.dev/group": "Admin",
          "gethomepage.dev/icon": "pgadmin.png",
          "gethomepage.dev/href": `https://${props.hosts[0]}`,
        },
      },
      spec: {
        entryPoints: ["websecure"],
        routes: [
          {
            match: props.hosts.map((h) => `Host(\`${h}\`)`).join(" || "),
            kind: IngressRouteSpecRoutesKind.RULE,
            services: [
              {
                name: pgadminService.name,
                port: IngressRouteSpecRoutesServicesPort.fromNumber(
                  pgadminService.port,
                ),
                kind: IngressRouteSpecRoutesServicesKind.SERVICE,
              },
            ],
          },
        ],
        tls: { secretName: certSecretName },
      },
    });

    // Restic credentials for Cloudflare R2 backups (uses postgres admin password as restic password)
    const credentials = new ResticCredentials(this, "restic-credentials", {
      namespace,
      name: "postgres-restic-credentials", // pragma: allowlist secret
      accessKeyIdBwSecretId: "cddf0c0b-52b1-4ca7-bdb5-b3e000f29516",
      accessKeySecretBwSecretId: "d75b4c3e-0789-41dc-986b-b3e000f276d2",
      resticPasswordBwSecretId: "8fb3f8c0-41a0-464c-a486-b3bf0130ad72",
    });

    const hostName = "backup-psql";
    const backupVolume = Volume.fromEmptyDir(
      this,
      "backup-volume",
      "backup-data",
    );
    const pgSecret = Secret.fromSecretName(
      this,
      "pg-secret-ref",
      credentialsSecretName,
    );
    const resticSecret = Secret.fromSecretName(
      this,
      "restic-secret-ref",
      credentials.secretName,
    );

    // Daily backup CronJob (runs at 2 AM)
    // Init container: pg_dumpall to emptyDir
    // Main container: restic backup to remote
    new CronJob(this, "daily-backup", {
      metadata: { name: "postgres-backup", namespace },
      schedule: Cron.schedule({ minute: "0", hour: "2" }),
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
echo "Starting pg_dumpall for $DATE..."
PGPASSWORD=$PGPASSWORD pg_dumpall -h ${serviceName} -U postgres > /backups/daily-$DATE.sql
echo "Backup complete:"
ls -la /backups/`,
          ],
          envVariables: {
            PGPASSWORD: EnvValue.fromSecretValue({
              secret: pgSecret,
              key: "password",
            }),
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
restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune
echo "Done. Current snapshots:"
restic snapshots`,
          ],
          envVariables: {
            RESTIC_REPOSITORY: EnvValue.fromValue(props.resticRepository),
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
    // kubectl create job --from=cronjob/postgres-restore -n postgres postgres-restore-manual
    const restoreVolume = Volume.fromEmptyDir(
      this,
      "restore-volume",
      "restore-data",
    );
    new CronJob(this, "restore", {
      metadata: { name: "postgres-restore", namespace },
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
ls -la /restore/`,
          ],
          envVariables: {
            RESTIC_REPOSITORY: EnvValue.fromValue(props.resticRepository),
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
echo "Importing $LATEST into postgres..."
PGPASSWORD=$PGPASSWORD psql -h ${serviceName} -U postgres -d postgres -f "$LATEST"
echo "Import complete."`,
          ],
          envVariables: {
            PGPASSWORD: EnvValue.fromSecretValue({
              secret: pgSecret,
              key: "password",
            }),
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
