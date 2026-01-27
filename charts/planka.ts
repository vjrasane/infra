import { Construct } from "constructs";
import { ChartProps, Helm, Size } from "cdk8s";
import { Namespace } from "cdk8s-plus-28";
import { LocalVolume } from "../lib/storage";
import { needsCrowdsecProtection } from "../lib/hosts";
import { Certificate } from "../imports/cert-manager.io";
import {
  IngressRoute,
  IngressRouteSpecRoutesKind,
  IngressRouteSpecRoutesMiddlewares,
  IngressRouteSpecRoutesServicesKind,
  IngressRouteSpecRoutesServicesPort,
} from "../imports/traefik.io";
import { BitwardenAuthTokenChart, BitwardenOrgSecret } from "./bitwarden";

interface PlankaChartProps extends ChartProps {
  readonly hosts: string[];
  readonly clusterIssuerName: string;
  readonly nodeName: string;
  readonly dataPath: string;
}

export class PlankaChart extends BitwardenAuthTokenChart {
  constructor(scope: Construct, id: string, props: PlankaChartProps) {
    const namespace = "planka";
    super(scope, id, { ...props, namespace });

    new Namespace(this, "namespace", {
      metadata: { name: namespace },
    });

    // Bitwarden secrets
    const secretKeySecretName = "planka-secretkey";
    new BitwardenOrgSecret(this, "secretkey", {
      metadata: { name: secretKeySecretName, namespace },
      spec: {
        secretName: secretKeySecretName,
        map: [
          {
            bwSecretId: "1c07820c-f3d4-48a2-b393-b3bb01803ffc",
            secretKeyName: "key",
          },
        ],
      },
    });

    const oidcSecretName = "planka-oidc";
    new BitwardenOrgSecret(this, "oidc", {
      metadata: { name: oidcSecretName, namespace },
      spec: {
        secretName: oidcSecretName,
        map: [
          {
            bwSecretId: "3cd04ac7-3019-495b-912d-b3bb018119fa",
            secretKeyName: "clientId",
          },
          {
            bwSecretId: "c184e87e-72e2-4a8e-9a9d-b3bb01812bba",
            secretKeyName: "clientSecret",
          },
        ],
      },
    });

    const dbUrlSecretName = "planka-dburl";
    new BitwardenOrgSecret(this, "dburl", {
      metadata: { name: dbUrlSecretName, namespace },
      spec: {
        secretName: dbUrlSecretName,
        map: [
          {
            bwSecretId: "3beb8422-9bf2-4f37-a8bf-b3bb018a6953",
            secretKeyName: "uri",
          },
        ],
      },
    });

    new LocalVolume(this, "data", {
      pvcName: "planka-data",
      pvName: "planka-data-pv",
      namespace,
      path: props.dataPath,
      nodeName: props.nodeName,
      size: Size.gibibytes(5),
    });

    // Planka Helm chart
    new Helm(this, "planka", {
      chart: "planka",
      repo: "https://plankanban.github.io/planka",
      version: "1.1.1",
      namespace,
      releaseName: "planka",
      values: {
        baseUrl: `https://${props.hosts[0]}`,
        persistence: {
          enabled: true,
          existingClaim: "planka-data",
        },
        postgresql: { enabled: false },
        existingSecretkeySecret: secretKeySecretName,
        existingDburlSecret: dbUrlSecretName,
        oidc: {
          enabled: true,
          issuerUrl: "https://auth.home.karkki.org/application/o/planka/",
          existingSecret: oidcSecretName,
          scopes: "openid profile email groups",
          admin: {
            roles: ["planka-admins"],
          },
        },
        extraEnv: [{ name: "OIDC_ENFORCED", value: "true" }],
      },
    });

    // TLS Certificate
    const certSecretName = "planka-tls";
    new Certificate(this, "certificate", {
      metadata: { name: "planka-tls", namespace },
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
    const crowdsecMiddleware: IngressRouteSpecRoutesMiddlewares = {
      name: "crowdsec-bouncer",
      namespace: "traefik",
    };

    new IngressRoute(this, "ingress", {
      metadata: {
        name: "planka",
        namespace,
        annotations: {
          "gethomepage.dev/enabled": "true",
          "gethomepage.dev/name": "Planka",
          "gethomepage.dev/description": "Project Management",
          "gethomepage.dev/group": "Apps",
          "gethomepage.dev/icon": "planka.png",
          "gethomepage.dev/href": `https://${props.hosts[0]}`,
          "gethomepage.dev/pod-selector": "app.kubernetes.io/name=planka",
        },
      },
      spec: {
        entryPoints: ["websecure"],
        routes: [
          {
            match: props.hosts.map((h) => `Host(\`${h}\`)`).join(" || "),
            kind: IngressRouteSpecRoutesKind.RULE,
            middlewares: needsCrowdsecProtection(props.hosts)
              ? [crowdsecMiddleware]
              : undefined,
            services: [
              {
                name: "planka",
                port: IngressRouteSpecRoutesServicesPort.fromNumber(1337),
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
