import { Construct } from "constructs";
import { ChartProps, Size } from "cdk8s";
import {
  Namespace,
  Deployment,
  EnvValue,
  Volume,
  PersistentVolumeClaim,
  PersistentVolumeAccessMode,
  Node,
  NodeLabelQuery,
} from "cdk8s-plus-28";
import { BitwardenAuthTokenChart, BitwardenOrgSecret } from "./bitwarden";
import { getPublicSecurityMiddlewares } from "../lib/hosts";
import { Certificate } from "../imports/cert-manager.io";
import {
  IngressRoute,
  IngressRouteSpecRoutesKind,
  IngressRouteSpecRoutesServicesKind,
  IngressRouteSpecRoutesServicesPort,
} from "../imports/traefik.io";
import { PostgresBackup } from "../lib/postgres-backup";
import { Postgres } from "../lib/postgres";
import { LocalPathPvc } from "../lib/local-path";

interface ImmichChartProps extends ChartProps {
  readonly hosts: string[];
  readonly clusterIssuerName: string;
  readonly storageClassName: string;
  readonly nodeName: string;
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

    const credentialsSecretName = "immich-db-credentials";
    // TODO: Create a secret in Bitwarden Secrets Manager and update this ID
    const dbPasswordBwSecretId = "00000000-0000-0000-0000-000000000000";
    new BitwardenOrgSecret(this, "db-credentials", {
      metadata: { name: credentialsSecretName, namespace },
      spec: {
        secretName: credentialsSecretName,
        map: [
          {
            bwSecretId: dbPasswordBwSecretId,
            secretKeyName: "password",
          },
        ],
      },
    });

    const targetNode = Node.labeled(
      NodeLabelQuery.is("kubernetes.io/hostname", props.nodeName),
    );

    const dbName = "immich";
    const dbUser = "immich";
    const dbServiceName = "immich-postgres";

    const dbVolume = new LocalPathPvc(this, "immich-postgres-data", {
      namespace,
      name: "immich-postgres-data",
      size: Size.gibibytes(10),
    }).toVolume();

    new Postgres(this, "immich-postgres", {
      namespace,
      name: "immich-postgres",
      volume: dbVolume,
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
    redisDeployment.scheduling.attract(targetNode);
    const redisService = redisDeployment.exposeViaService({
      name: redisServiceName,
    });

    const mlServiceName = "immich-machine-learning";
    const mlPodLabels = { "app.kubernetes.io/name": "immich-machine-learning" };

    const mlCachePvc = new PersistentVolumeClaim(this, "ml-cache-pvc", {
      metadata: { name: "immich-ml-cache", namespace },
      storageClassName: props.storageClassName,
      accessModes: [PersistentVolumeAccessMode.READ_WRITE_ONCE],
      storage: Size.gibibytes(10),
    });
    const mlCacheVolume = Volume.fromPersistentVolumeClaim(
      this,
      "ml-cache-volume",
      mlCachePvc,
    );

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
    mlDeployment.scheduling.attract(targetNode);
    const mlService = mlDeployment.exposeViaService({ name: mlServiceName });

    const libraryPvc = new PersistentVolumeClaim(this, "library-pvc", {
      metadata: { name: "immich-library", namespace },
      storageClassName: props.storageClassName,
      accessModes: [PersistentVolumeAccessMode.READ_WRITE_ONCE],
      storage: props.libraryStorageSize ?? Size.gibibytes(100),
    });
    const libraryVolume = Volume.fromPersistentVolumeClaim(
      this,
      "library-volume",
      libraryPvc,
    );

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
            DB_HOSTNAME: EnvValue.fromValue(dbServiceName),
            DB_USERNAME: EnvValue.fromValue(dbUser),
            DB_PASSWORD: EnvValue.fromSecretValue({
              secret: { name: credentialsSecretName } as any,
              key: "password",
            }),
            DB_DATABASE_NAME: EnvValue.fromValue(dbName),
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
    serverDeployment.scheduling.attract(targetNode);
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
      name: "immich-db",
      postgresHost: dbServiceName,
      postgresUser: dbUser,
      postgresDatabase: dbName,
      postgresPasswordSecretName: credentialsSecretName,
      postgresPasswordSecretKey: "password",
      resticRepository: props.resticRepository,
      resticAccessKeyIdBwSecretId: "cddf0c0b-52b1-4ca7-bdb5-b3e000f29516",
      resticAccessKeySecretBwSecretId: "d75b4c3e-0789-41dc-986b-b3e000f276d2",
      resticPasswordBwSecretId: "8fb3f8c0-41a0-464c-a486-b3bf0130ad72",
    });
  }
}
