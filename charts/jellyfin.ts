import { Construct } from "constructs";
import { ChartProps, Cron, Size } from "cdk8s";
import { Namespace, Deployment, Protocol } from "cdk8s-plus-28";
import { BitwardenAuthTokenChart } from "./bitwarden";
import { ResticBackup, ResticCredentials, ResticPrune } from "../lib/restic";
import { LocalVolume } from "../lib/storage";
import { getPublicSecurityMiddlewares } from "../lib/hosts";
import { Certificate } from "../imports/cert-manager.io";
import {
  IngressRoute,
  IngressRouteSpecRoutesKind,
  IngressRouteSpecRoutesServicesKind,
  IngressRouteSpecRoutesServicesPort,
} from "../imports/traefik.io";

interface JellyfinChartProps extends ChartProps {
  readonly hosts: string[];
  readonly clusterIssuerName: string;
  readonly nodeName: string;
  readonly configPath: string;
  readonly mediaPath: string;
  readonly resticRepository: string;
}

export class JellyfinChart extends BitwardenAuthTokenChart {
  constructor(scope: Construct, id: string, props: JellyfinChartProps) {
    const namespace = "jellyfin";
    super(scope, id, { ...props, namespace });

    new Namespace(this, "namespace", {
      metadata: { name: namespace },
    });

    const { volume: configVolume } = new LocalVolume(this, "config", {
      pvcName: "jellyfin-config",
      pvName: "jellyfin-config-pv",
      namespace,
      path: props.configPath,
      nodeName: props.nodeName,
      size: Size.gibibytes(10),
    });

    const { volume: mediaVolume } = new LocalVolume(this, "media", {
      pvcName: "jellyfin-media",
      pvName: "jellyfin-media-pv",
      namespace,
      path: props.mediaPath,
      nodeName: props.nodeName,
      size: Size.tebibytes(1),
      accessMode: "ReadOnlyMany",
    });

    const podLabels = { "app.kubernetes.io/name": "jellyfin" };
    const deployment = new Deployment(this, "jellyfin", {
      metadata: { name: "jellyfin", namespace, labels: podLabels },
      podMetadata: { labels: podLabels },
      replicas: 1,
      volumes: [configVolume, mediaVolume],
      containers: [
        {
          name: "jellyfin",
          image: "lscr.io/linuxserver/jellyfin:latest",
          ports: [{ number: 8096, protocol: Protocol.TCP, name: "http" }],
          volumeMounts: [
            { path: "/config", volume: configVolume },
            { path: "/data/music", volume: mediaVolume, readOnly: true },
          ],
          securityContext: {
            ensureNonRoot: false,
            readOnlyRootFilesystem: false,
          },
        },
      ],
    });

    const service = deployment.exposeViaService();

    const certSecretName = "jellyfin-tls"; // pragma: allowlist secret
    new Certificate(this, "cert", {
      metadata: {
        name: "jellyfin-tls",
        namespace,
      },
      spec: {
        secretName: certSecretName,
        issuerRef: {
          name: props.clusterIssuerName,
          kind: "ClusterIssuer",
        },
        dnsNames: props.hosts,
      },
    });

    new IngressRoute(this, "ingress", {
      metadata: {
        name: "jellyfin",
        namespace,
        annotations: {
          "gethomepage.dev/enabled": "true",
          "gethomepage.dev/name": "Jellyfin",
          "gethomepage.dev/description": "Media Server",
          "gethomepage.dev/group": "Apps",
          "gethomepage.dev/icon": "jellyfin.png",
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
                name: service.name,
                port: IngressRouteSpecRoutesServicesPort.fromNumber(
                  service.port,
                ),
                kind: IngressRouteSpecRoutesServicesKind.SERVICE,
              },
            ],
          },
        ],
        tls: {
          secretName: certSecretName,
        },
      },
    });

    // Restic backup for config volume
    const credentials = new ResticCredentials(this, "restic-credentials", {
      namespace,
      name: "jellyfin-restic-credentials", // pragma: allowlist secret
      accessKeyIdBwSecretId: "43c2041e-177f-494d-b78a-b3d60141f01f",
      accessKeySecretBwSecretId: "98e48367-4a09-40e0-977b-b3d60141da4d",
      resticPasswordBwSecretId: "31406ff6-6d88-4694-82e6-b3d400b71b05",
    }).toSecret(this, "restic-credentials-secret");

    const hostName = "jellyfin";

    new ResticBackup(this, "restic-backup", {
      namespace,
      name: "jellyfin-backup",
      repository: props.resticRepository,
      credentials,
      hostName,
      volume: configVolume,
      schedule: Cron.schedule({ minute: "0", hour: "5", weekDay: "0" }), // Sunday 5 AM
    });

    new ResticPrune(this, "restic-prune", {
      namespace,
      name: "jellyfin-prune",
      repository: props.resticRepository,
      credentials,
      hostName,
      schedule: Cron.schedule({ minute: "0", hour: "5", day: "1" }), // 1st of month 5 AM
    });
  }
}
