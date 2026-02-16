import { Construct } from "constructs";
import { ChartProps, Size } from "cdk8s";
import { Namespace, Deployment, EnvValue, Protocol } from "cdk8s-plus-28";
import { BitwardenAuthTokenChart } from "./bitwarden";
import { getPublicSecurityMiddlewares } from "../lib/hosts";
import { Certificate } from "../imports/cert-manager.io";
import {
  IngressRoute,
  IngressRouteSpecRoutesKind,
  IngressRouteSpecRoutesServicesKind,
  IngressRouteSpecRoutesServicesPort,
} from "../imports/traefik.io";
import { PostgresBackup } from "../lib/postgres-backup";
import { Postgres, PostgresCredentials } from "../lib/postgres";
import { LocalPathPvc } from "../lib/local-path";

interface ImmichChartProps extends ChartProps {
  readonly hosts: string[];
  readonly clusterIssuerName: string;
  readonly libraryStorageSize?: Size;
  readonly resticRepository: string;
}

export class ImmichChart extends BitwardenAuthTokenChart {
  constructor(scope: Construct, id: string, props: ImmichChartProps) {
    const namespace = "immich";
    super(scope, id, { ...props, namespace });

    new Namespace(this, "namespace", {
      metadata: { name: namespace },
    });

    // TODO: Create a secret in Bitwarden Secrets Manager and update this ID
    const dbPasswordBwSecretId = "00000000-0000-0000-0000-000000000000";

    const dbCredentials = new PostgresCredentials(
      this,
      "immich-db-credentials",
      {
        database: "immich",
        passwordSecretId: dbPasswordBwSecretId,
      },
    );

    const postgres = new Postgres(this, "immich-postgres", {
      image: "tensorchord/pgvecto-rs:pg17-v0.4.0",
      credentials: dbCredentials,
    });

    const redisServiceName = "immich-redis";
    const redisPodLabels = { "app.kubernetes.io/name": "immich-redis" };
    const redisDeployment = new Deployment(this, "redis", {
      metadata: { name: "immich-redis", namespace, labels: redisPodLabels },
      podMetadata: { labels: redisPodLabels },
      replicas: 1,
      containers: [
        {
          name: "redis",
          image: "docker.io/valkey/valkey:9.0-alpine",
          ports: [{ number: 6379, protocol: Protocol.TCP, name: "redis" }],
          securityContext: {
            ensureNonRoot: false,
            readOnlyRootFilesystem: false,
          },
        },
      ],
    });
    const redisService = redisDeployment.exposeViaService({
      name: redisServiceName,
    });

    const mlServiceName = "immich-machine-learning";
    const mlPodLabels = { "app.kubernetes.io/name": "immich-machine-learning" };

    const mlCacheVolume = new LocalPathPvc(this, "ml-cache-pvc", {
      namespace,
      name: "immich-ml-cache",
    }).toVolume();

    const mlDeployment = new Deployment(this, "machine-learning", {
      metadata: {
        name: "immich-machine-learning",
        namespace,
        labels: mlPodLabels,
      },
      podMetadata: { labels: mlPodLabels },
      replicas: 1,
      volumes: [mlCacheVolume],
      containers: [
        {
          name: "machine-learning",
          image: "ghcr.io/immich-app/immich-machine-learning:release",
          ports: [{ number: 3003, protocol: Protocol.TCP, name: "http" }],
          envVariables: {
            TRANSFORMERS_CACHE: EnvValue.fromValue("/cache"),
            HF_XET_CACHE: EnvValue.fromValue("/cache/huggingface-xet"),
            MPLCONFIGDIR: EnvValue.fromValue("/cache/matplotlib-config"),
          },
          volumeMounts: [{ path: "/cache", volume: mlCacheVolume }],
          securityContext: {
            ensureNonRoot: false,
            readOnlyRootFilesystem: false,
          },
        },
      ],
    });
    const mlService = mlDeployment.exposeViaService({ name: mlServiceName });

    const libraryVolume = new LocalPathPvc(this, "library-pvc", {
      namespace,
      name: "immich-library",
      storage: Size.tebibytes(1),
    }).toVolume();

    const serverPodLabels = { "app.kubernetes.io/name": "immich-server" };
    const serverDeployment = new Deployment(this, "server", {
      metadata: { name: "immich-server", namespace, labels: serverPodLabels },
      podMetadata: { labels: serverPodLabels },
      replicas: 1,
      volumes: [libraryVolume],
      containers: [
        {
          name: "server",
          image: "ghcr.io/immich-app/immich-server:release",
          ports: [{ number: 2283, protocol: Protocol.TCP, name: "http" }],
          envVariables: {
            DB_HOSTNAME: postgres.serviceFqdn,
            DB_USERNAME: dbCredentials.user,
            DB_PASSWORD: dbCredentials.password,
            DB_DATABASE_NAME: dbCredentials.database,
            REDIS_HOSTNAME: EnvValue.fromValue(redisService.name),
            IMMICH_MACHINE_LEARNING_URL: EnvValue.fromValue(
              `http://${mlService.name}:3003`,
            ),
          },
          volumeMounts: [
            { path: "/usr/src/app/upload", volume: libraryVolume },
          ],
          securityContext: {
            ensureNonRoot: false,
            readOnlyRootFilesystem: false,
          },
        },
      ],
    });
    const serverService = serverDeployment.exposeViaService();

    const certSecretName = "immich-tls";
    new Certificate(this, "cert", {
      metadata: { name: "immich-tls", namespace },
      spec: {
        secretName: certSecretName,
        issuerRef: { name: props.clusterIssuerName, kind: "ClusterIssuer" },
        dnsNames: props.hosts,
      },
    });

    new IngressRoute(this, "ingress", {
      metadata: {
        name: "immich",
        namespace,
        annotations: {
          "gethomepage.dev/enabled": "true",
          "gethomepage.dev/name": "Immich",
          "gethomepage.dev/description": "Photo Management",
          "gethomepage.dev/group": "Apps",
          "gethomepage.dev/icon": "immich.png",
          "gethomepage.dev/href": `https://${props.hosts[0]}`,
        },
      },
      spec: {
        entryPoints: ["websecure"],
        routes: [
          {
            match: props.hosts.map((h) => `Host(\`${h}\`)`).join(" || "),
            kind: IngressRouteSpecRoutesKind.RULE,
            middlewares: getPublicSecurityMiddlewares(props.hosts),
            services: [
              {
                name: serverService.name,
                port: IngressRouteSpecRoutesServicesPort.fromNumber(
                  serverService.port,
                ),
                kind: IngressRouteSpecRoutesServicesKind.SERVICE,
              },
            ],
          },
        ],
        tls: { secretName: certSecretName },
      },
    });

    // PostgreSQL backup and restore (uses same restic credentials as central postgres)
    new PostgresBackup(this, "postgres-backup", {
      namespace,
      postgresHost: postgres.serviceFqdn,
      postgresCredentials: dbCredentials,
    });
  }
}
