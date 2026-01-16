import { Construct } from "constructs";
import { Chart, ChartProps } from "cdk8s";
import { Namespace, Deployment, Volume, Protocol } from "cdk8s-plus-28";
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

interface JellyfinChartProps extends ChartProps {
  readonly hosts: string[];
  readonly clusterIssuerName: string;
  readonly nodeName: string;
  readonly configPath: string;
  readonly mediaPath: string;
}

export class JellyfinChart extends Chart {
  constructor(scope: Construct, id: string, props: JellyfinChartProps) {
    super(scope, id, { ...props });

    const namespace = "jellyfin";
    const pvNameConfig = "jellyfin-config-pv";
    const pvcNameConfig = "jellyfin-config";
    const pvNameMedia = "jellyfin-media-pv";
    const pvcNameMedia = "jellyfin-media";

    new Namespace(this, "namespace", {
      metadata: { name: namespace },
    });

    // Config PV/PVC (static path on ssd1)
    new KubePersistentVolume(this, "config-pv", {
      metadata: { name: pvNameConfig },
      spec: {
        capacity: { storage: Quantity.fromString("10Gi") },
        accessModes: ["ReadWriteOnce"],
        persistentVolumeReclaimPolicy: "Retain",
        storageClassName: "",
        local: { path: props.configPath },
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

    new KubePersistentVolumeClaim(this, "config-pvc", {
      metadata: { name: pvcNameConfig, namespace },
      spec: {
        accessModes: ["ReadWriteOnce"],
        storageClassName: "",
        volumeName: pvNameConfig,
        resources: {
          requests: { storage: Quantity.fromString("10Gi") },
        },
      },
    });

    // Media PV/PVC (read-only access to music subdirectory of samba share)
    new KubePersistentVolume(this, "media-pv", {
      metadata: { name: pvNameMedia },
      spec: {
        capacity: { storage: Quantity.fromString("1Ti") },
        accessModes: ["ReadOnlyMany"],
        persistentVolumeReclaimPolicy: "Retain",
        storageClassName: "",
        local: { path: props.mediaPath },
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

    new KubePersistentVolumeClaim(this, "media-pvc", {
      metadata: { name: pvcNameMedia, namespace },
      spec: {
        accessModes: ["ReadOnlyMany"],
        storageClassName: "",
        volumeName: pvNameMedia,
        resources: {
          requests: { storage: Quantity.fromString("1Ti") },
        },
      },
    });

    const configVolume = Volume.fromPersistentVolumeClaim(
      this,
      "config-volume",
      { name: pvcNameConfig } as any,
    );

    const mediaVolume = Volume.fromPersistentVolumeClaim(this, "media-volume", {
      name: pvcNameMedia,
    } as any);

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
  }
}
