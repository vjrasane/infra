import { Construct } from "constructs";
import { ChartProps, Size, Cron } from "cdk8s";
import {
  Namespace,
  StatefulSet,
  Deployment,
  EnvValue,
  Volume,
  PersistentVolumeClaim,
  PersistentVolumeAccessMode,
  Cpu,
  ConfigMap,
  CronJob,
  Service,
  Protocol,
} from "cdk8s-plus-28";
import { Certificate } from "../imports/cert-manager.io";
import {
  IngressRoute,
  IngressRouteSpecRoutesKind,
  IngressRouteSpecRoutesServicesKind,
  IngressRouteSpecRoutesServicesPort,
} from "../imports/traefik.io";
import { BitwardenAuthTokenChart, BitwardenOrgSecret } from "./bitwarden";

interface PostgresChartProps extends ChartProps {
  readonly hosts: string[];
  readonly clusterIssuerName: string;
  readonly storageClassName: string;
  readonly storageSize: Size;
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
    const credentialsSecretName = "postgres-credentials";
    new BitwardenOrgSecret(this, "credentials-secret", {
      metadata: { name: credentialsSecretName, namespace },
      spec: {
        secretName: credentialsSecretName,
        map: [
          {
            bwSecretId: "8fb3f8c0-41a0-464c-a486-b3bf0130ad72",
            secretKeyName: "password",
          },
        ],
      },
    });

    // PVC for PostgreSQL data
    const pvc = new PersistentVolumeClaim(this, "postgres-pvc", {
      metadata: { name: "postgres-data", namespace },
      storageClassName: props.storageClassName,
      accessModes: [PersistentVolumeAccessMode.READ_WRITE_ONCE],
      storage: props.storageSize,
    });

    const dataVolume = Volume.fromPersistentVolumeClaim(
      this,
      "data-volume",
      pvc,
    );

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
          securityContext: { ensureNonRoot: false, readOnlyRootFilesystem: false },
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
    const serversVolume = Volume.fromConfigMap(this, "servers-volume", serversConfig, { name: "servers" });

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
            PGADMIN_SERVER_JSON_FILE: EnvValue.fromValue("/pgadmin4/servers.json"),
          },
          securityContext: {
            ensureNonRoot: false,
            readOnlyRootFilesystem: false,
            allowPrivilegeEscalation: true,
          },
          volumeMounts: [
            { path: "/var/lib/pgadmin", volume: pgadminDataVolume },
            { path: "/pgadmin4/servers.json", volume: serversVolume, subPath: "servers.json" },
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
    const certSecretName = "pgadmin-tls";
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

    // B2 credentials for restic backups
    const b2CredentialsSecretName = "b2-backup-credentials";
    new BitwardenOrgSecret(this, "b2-credentials", {
      metadata: { name: b2CredentialsSecretName, namespace },
      spec: {
        secretName: b2CredentialsSecretName,
        map: [
          { bwSecretId: "53ed67f3-9a98-4b33-974d-b3c1016ac2e1", secretKeyName: "AWS_ACCESS_KEY_ID" },
          { bwSecretId: "6adf0a82-23c4-4906-bb68-b3c1016ad9f1", secretKeyName: "AWS_SECRET_ACCESS_KEY" },
        ],
      },
    });

    // PVC for backups
    const backupPvc = new PersistentVolumeClaim(this, "backup-pvc", {
      metadata: { name: "postgres-backups", namespace },
      storageClassName: props.storageClassName,
      accessModes: [PersistentVolumeAccessMode.READ_WRITE_ONCE],
      storage: Size.gibibytes(5),
    });
    const backupVolume = Volume.fromPersistentVolumeClaim(this, "backup-volume", backupPvc);

    // Daily pg_dump CronJob (runs at 2 AM)
    new CronJob(this, "daily-backup", {
      metadata: { name: "postgres-daily-backup", namespace },
      schedule: Cron.schedule({ minute: "0", hour: "2" }),
      volumes: [backupVolume],
      containers: [
        {
          name: "backup",
          image: "postgres:17-alpine",
          command: ["/bin/sh", "-c"],
          args: [
            `set -e
DATE=$(date +%Y-%m-%d)
echo "Starting backup for $DATE..."
PGPASSWORD=$PGPASSWORD pg_dump -h ${serviceName} -U postgres -d postgres > /backups/daily-$DATE.sql
echo "Backup complete. Cleaning up old backups..."
find /backups -name "daily-*.sql" -mtime +7 -delete
echo "Done. Current backups:"
ls -la /backups/`,
          ],
          envVariables: {
            PGPASSWORD: EnvValue.fromSecretValue({
              secret: { name: credentialsSecretName } as any,
              key: "password",
            }),
          },
          volumeMounts: [{ path: "/backups", volume: backupVolume }],
          securityContext: { ensureNonRoot: false },
        },
      ],
    });

    // Weekly restic backup CronJob (runs Sunday at 3 AM)
    new CronJob(this, "weekly-backup", {
      metadata: { name: "postgres-weekly-backup", namespace },
      schedule: Cron.schedule({ minute: "0", hour: "3", weekDay: "0" }),
      volumes: [backupVolume],
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
restic backup --host backup-psql /backups
echo "Pruning old snapshots..."
restic forget --host backup-psql --keep-weekly 4 --keep-monthly 6 --prune
echo "Done. Snapshots:"
restic snapshots`,
          ],
          envVariables: {
            RESTIC_REPOSITORY: EnvValue.fromValue("s3:s3.eu-central-003.backblazeb2.com/karkkinet-psql-backups"),
            RESTIC_PASSWORD: EnvValue.fromSecretValue({
              secret: { name: credentialsSecretName } as any,
              key: "password",
            }),
            AWS_ACCESS_KEY_ID: EnvValue.fromSecretValue({
              secret: { name: b2CredentialsSecretName } as any,
              key: "AWS_ACCESS_KEY_ID",
            }),
            AWS_SECRET_ACCESS_KEY: EnvValue.fromSecretValue({
              secret: { name: b2CredentialsSecretName } as any,
              key: "AWS_SECRET_ACCESS_KEY",
            }),
          },
          volumeMounts: [{ path: "/backups", volume: backupVolume }],
          securityContext: { ensureNonRoot: false, readOnlyRootFilesystem: false },
        },
      ],
    });
  }
}
