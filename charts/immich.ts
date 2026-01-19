import { Construct } from "constructs";
import { ChartProps, Helm, Size } from "cdk8s";
import { Namespace } from "cdk8s-plus-28";
import { Certificate } from "../imports/cert-manager.io";
import {
  IngressRoute,
  IngressRouteSpecRoutesKind,
  IngressRouteSpecRoutesServicesKind,
  IngressRouteSpecRoutesServicesPort,
} from "../imports/traefik.io";
import { BitwardenAuthTokenChart, BitwardenOrgSecret } from "./bitwarden";
import { LocalVolume } from "../lib/storage";

interface ImmichChartProps extends ChartProps {
  readonly hosts: string[];
  readonly clusterIssuerName: string;
  readonly nodeName: string;
  readonly libraryPath: string;
  readonly thumbsPath: string;
  readonly postgresHost: string;
}

export class ImmichChart extends BitwardenAuthTokenChart {
  constructor(scope: Construct, id: string, props: ImmichChartProps) {
    const namespace = "immich";
    super(scope, id, { ...props, namespace });

    new Namespace(this, "namespace", {
      metadata: { name: namespace },
    });

    // Secrets from Bitwarden
    const dbSecretName = "immich-db";
    new BitwardenOrgSecret(this, "db-secret", {
      metadata: { name: dbSecretName, namespace },
      spec: {
        secretName: dbSecretName,
        map: [
          {
            bwSecretId: "TODO-POSTGRES-PASSWORD",
            secretKeyName: "password",
          },
        ],
      },
    });

    const oauthSecretName = "immich-oauth";
    new BitwardenOrgSecret(this, "oauth-secret", {
      metadata: { name: oauthSecretName, namespace },
      spec: {
        secretName: oauthSecretName,
        map: [
          {
            bwSecretId: "TODO-OAUTH-CLIENT-ID",
            secretKeyName: "clientId",
          },
          {
            bwSecretId: "TODO-OAUTH-CLIENT-SECRET",
            secretKeyName: "clientSecret",
          },
        ],
      },
    });

    // Volumes
    new LocalVolume(this, "library", {
      name: "immich-library",
      namespace,
      path: props.libraryPath,
      nodeName: props.nodeName,
      size: Size.tebibytes(1),
    });

    new LocalVolume(this, "thumbs", {
      name: "immich-thumbs",
      namespace,
      path: props.thumbsPath,
      nodeName: props.nodeName,
      size: Size.gibibytes(50),
    });

    // Immich Helm chart
    new Helm(this, "immich", {
      chart: "immich",
      repo: "https://immich-app.github.io/immich-charts",
      namespace,
      releaseName: "immich",
      values: {
        image: {
          tag: "v1.123.0",
        },
        immich: {
          persistence: {
            library: {
              existingClaim: "immich-library",
            },
          },
        },
        server: {
          persistence: {
            thumbs: {
              existingClaim: "immich-thumbs",
              mountPath: "/usr/src/app/upload/thumbs",
            },
          },
        },
        machinelearning: {
          enabled: true,
        },
        redis: {
          enabled: true,
        },
        postgresql: {
          enabled: false,
        },
        env: {
          DB_HOSTNAME: props.postgresHost,
          DB_PORT: "5432",
          DB_USERNAME: "postgres",
          DB_DATABASE_NAME: "immich",
        },
        envFrom: [
          {
            secretRef: {
              name: dbSecretName,
            },
          },
        ],
      },
    });

    // TLS Certificate
    const certSecretName = "immich-tls";
    new Certificate(this, "cert", {
      metadata: { name: "immich-tls", namespace },
      spec: {
        secretName: certSecretName,
        issuerRef: {
          name: props.clusterIssuerName,
          kind: "ClusterIssuer",
        },
        dnsNames: props.hosts,
      },
    });

    // IngressRoute
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
            services: [
              {
                name: "immich-server",
                port: IngressRouteSpecRoutesServicesPort.fromNumber(2283),
                kind: IngressRouteSpecRoutesServicesKind.SERVICE,
              },
            ],
          },
        ],
        tls: { secretName: certSecretName },
      },
    });
  }
}
