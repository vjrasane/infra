import { ChartProps } from "cdk8s";
import { EnvValue, Namespace } from "cdk8s-plus-28";
import { Construct } from "constructs";
import { Authentik } from "../imports/authentik";
import { Certificate } from "../imports/cert-manager.io";
import {
  IngressRoute,
  IngressRouteSpecRoutesKind,
  IngressRouteSpecRoutesServicesKind,
  IngressRouteSpecRoutesServicesPort,
} from "../imports/traefik.io";
import { LOCAL_PATH_STORAGE_CLASS_NAME } from "../lib/local-path";
import { PostgresCredentials } from "../lib/postgres";
import { PostgresBackup } from "../lib/postgres-backup";
import { BitwardenAuthTokenChart, BitwardenOrgSecret } from "./bitwarden";

interface AuthentikChartProps extends ChartProps {
  readonly hosts: string[];
  readonly clusterIssuerName: string;
  readonly resticRepository: string;
}

export class AuthentikChart extends BitwardenAuthTokenChart {
  constructor(scope: Construct, id: string, props: AuthentikChartProps) {
    const namespace = "authentik";
    super(scope, id, { ...props, namespace });

    new Namespace(this, "namespace", {
      metadata: { name: namespace },
    });

    // Bitwarden secrets
    const secretKeySecretName = "authentik-secret-key"; // pragma: allowlist secret
    new BitwardenOrgSecret(this, "secret-key", {
      metadata: { name: secretKeySecretName, namespace },
      spec: {
        secretName: secretKeySecretName,
        map: [
          {
            bwSecretId: "008e8051-67ef-462b-949a-b3bb0181855b",
            secretKeyName: "AUTHENTIK_SECRET_KEY",
          },
        ],
      },
    });

    const bootstrapSecretName = "authentik-bootstrap"; // pragma: allowlist secret
    new BitwardenOrgSecret(this, "bootstrap", {
      metadata: { name: bootstrapSecretName, namespace },
      spec: {
        secretName: bootstrapSecretName,
        map: [
          {
            bwSecretId: "0e60acee-ac8e-4411-b8a6-b3c10136eae9",
            secretKeyName: "AUTHENTIK_BOOTSTRAP_EMAIL",
          },
          {
            bwSecretId: "da979324-1d40-4ac4-a812-b3c101370203",
            secretKeyName: "AUTHENTIK_BOOTSTRAP_PASSWORD",
          },
        ],
      },
    });

    const dbCredentials = new PostgresCredentials(this, "db-credentials", {
      namespace,
      passwordSecretName: "authentik-db",
      passwordSecretId: "395b1143-3eea-4071-b3f0-b3bb01819829",
    });

    // Authentik Helm chart with embedded PostgreSQL
    new Authentik(this, "authentik", {
      namespace,
      releaseName: "authentik",
      values: {
        global: {
          envFrom: [
            { secretRef: { name: secretKeySecretName } },
            { secretRef: { name: bootstrapSecretName } },
          ],
          env: [
            {
              name: "AUTHENTIK_POSTGRESQL__PASSWORD",
              valueFrom: dbCredentials.password.valueFrom,
            },
          ],
        },
        postgresql: {
          enabled: true,
          auth: {
            existingSecret: dbCredentials.passwordSecretName,
            secretKeys: {
              adminPasswordKey: dbCredentials.passwordSecretKey,
              userPasswordKey: dbCredentials.passwordSecretKey,
            },
          },
          primary: {
            persistence: {
              enabled: true,
              storageClass: LOCAL_PATH_STORAGE_CLASS_NAME,
              size: "10Gi",
            },
            resources: {
              requests: { memory: "256Mi", cpu: "250m" },
              limits: { memory: "1Gi", cpu: "1000m" },
            },
          },
        },
        server: {
          replicas: 3,
          ingress: { enabled: false },
        },
        worker: {
          replicas: 2,
        },
      },
    });

    // PostgreSQL backup and restore
    new PostgresBackup(this, "postgres-backup", {
      namespace,
      name: "authentik-db",
      postgresHost: EnvValue.fromValue("authentik-postgresql"),
      postgresCredentials: dbCredentials,
    });

    // TLS Certificate
    const certSecretName = "authentik-tls"; // pragma: allowlist secret
    new Certificate(this, "certificate", {
      metadata: { name: "authentik-tls", namespace },
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
        name: "authentik",
        namespace,
        annotations: {
          "gethomepage.dev/enabled": "true",
          "gethomepage.dev/name": "Authentik",
          "gethomepage.dev/description": "Identity Provider",
          "gethomepage.dev/group": "Apps",
          "gethomepage.dev/icon": "authentik.png",
          "gethomepage.dev/href": `https://${props.hosts[0]}`,
          "gethomepage.dev/pod-selector": "app.kubernetes.io/component=server",
        },
      },
      spec: {
        entryPoints: ["websecure"],
        routes: [
          {
            match: props.hosts.map((h) => `Host(\`${h}\`)`).join(" || "),
            kind: IngressRouteSpecRoutesKind.RULE,
            middlewares: [{ name: "crowdsec-bouncer", namespace: "traefik" }],
            services: [
              {
                name: "authentik-server",
                port: IngressRouteSpecRoutesServicesPort.fromNumber(80),
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
