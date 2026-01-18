import { Construct } from "constructs";
import { ChartProps, Size, Cron } from "cdk8s";
import {
  Namespace,
  StatefulSet,
  Deployment,
  EnvValue,
  Volume,
  Cpu,
  ConfigMap,
  CronJob,
  Service,
  Protocol,
} from "cdk8s-plus-28";
import {
  KubePersistentVolume,
  KubePersistentVolumeClaim,
  Quantity,
} from "cdk8s-plus-28/lib/imports/k8s";
import { Certificate } from "../imports/cert-manager.io";
import {
  IngressRoute,
  IngressRouteSpecRoutesKind,
  IngressRouteSpecRoutesServicesKind,
  IngressRouteSpecRoutesServicesPort,
} from "../imports/traefik.io";
import { BitwardenAuthTokenChart, BitwardenOrgSecret } from "./bitwarden";
import { ResticBackup, ResticCredentials, ResticPrune } from "../lib/restic";

interface PostgresChartProps extends ChartProps {
  readonly hosts: string[];
  readonly clusterIssuerName: string;
  readonly nodeName: string;
  readonly dataPath: string;
  readonly backupsPath: string;
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

    // Static PV/PVC for PostgreSQL data
    const dataPvName = "postgres-data-pv";
    const dataPvcName = "postgres-data";

    new KubePersistentVolume(this, "data-pv", {
      metadata: { name: dataPvName },
      spec: {
        capacity: { storage: Quantity.fromString("10Gi") },
        accessModes: ["ReadWriteOnce"],
        persistentVolumeReclaimPolicy: "Retain",
        storageClassName: "",
        local: { path: props.dataPath },
        nodeAffinity: {
          required: {
            nodeSelectorTerms: [
              {
                matchExpressions: [
                  {
                    key: "kubernetes.io/hostname",
                    operator: "In",
                    values: [props.nodeName],
                  },
                ],
              },
            ],
          },
        },
      },
    });

    new KubePersistentVolumeClaim(this, "data-pvc", {
      metadata: { name: dataPvcName, namespace },
      spec: {
        accessModes: ["ReadWriteOnce"],
        storageClassName: "",
        volumeName: dataPvName,
        resources: {
          requests: { storage: Quantity.fromString("10Gi") },
        },
      },
    });

    const dataVolume = Volume.fromPersistentVolumeClaim(
      this,
      "data-volume",
      { name: dataPvcName } as any,
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

    // Restic credentials for B2 backups (uses postgres admin password as restic password)
    const credentials = new ResticCredentials(this, "restic-credentials", {
      namespace,
      name: "postgres-restic-credentials", // pragma: allowlist secret
      accessKeyIdBwSecretId: "43c2041e-177f-494d-b78a-b3d60141f01f",
      accessKeySecretBwSecretId: "98e48367-4a09-40e0-977b-b3d60141da4d",
      resticPasswordBwSecretId: "8fb3f8c0-41a0-464c-a486-b3bf0130ad72",
    });

    // Static PV/PVC for backups
    const backupPvName = "postgres-backups-pv";
    const backupPvcName = "postgres-backups";

    new KubePersistentVolume(this, "backup-pv", {
      metadata: { name: backupPvName },
      spec: {
        capacity: { storage: Quantity.fromString("5Gi") },
        accessModes: ["ReadWriteOnce"],
        persistentVolumeReclaimPolicy: "Retain",
        storageClassName: "",
        local: { path: props.backupsPath },
        nodeAffinity: {
          required: {
            nodeSelectorTerms: [
              {
                matchExpressions: [
                  {
                    key: "kubernetes.io/hostname",
                    operator: "In",
                    values: [props.nodeName],
                  },
                ],
              },
            ],
          },
        },
      },
    });

    new KubePersistentVolumeClaim(this, "backup-pvc", {
      metadata: { name: backupPvcName, namespace },
      spec: {
        accessModes: ["ReadWriteOnce"],
        storageClassName: "",
        volumeName: backupPvName,
        resources: {
          requests: { storage: Quantity.fromString("5Gi") },
        },
      },
    });

    const backupVolume = Volume.fromPersistentVolumeClaim(
      this,
      "backup-volume",
      { name: backupPvcName } as any,
    );

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

    // Weekly restic backup (runs Sunday at 3 AM)
    const hostName = "postgres";

    new ResticBackup(this, "restic-backup", {
      namespace,
      name: "postgres-backup",
      repository: props.resticRepository,
      credentialsSecretName: credentials.secretName,
      hostName,
      volume: backupVolume,
      volumeMountPath: "/backups",
      schedule: Cron.schedule({ minute: "0", hour: "3", weekDay: "0" }),
    });

    // Monthly prune (runs 1st of month at 4 AM)
    new ResticPrune(this, "restic-prune", {
      namespace,
      name: "postgres-prune",
      repository: props.resticRepository,
      credentialsSecretName: credentials.secretName,
      hostName,
      schedule: Cron.schedule({ minute: "0", hour: "4", day: "1" }),
    });
  }
}
