import { Construct } from "constructs";
import { ChartProps } from "cdk8s";
import {
  IngressRoute,
  IngressRouteSpecRoutesKind,
  IngressRouteSpecRoutesServicesKind,
  Middleware,
} from "../imports/traefik.io";
import { Certificate } from "../imports/cert-manager.io";
import { BitwardenAuthTokenChart, BitwardenOrgSecret } from "./bitwarden";

interface TraefikDashboardChartProps extends ChartProps {
  readonly hosts: string[];
  readonly clusterIssuerName: string;
}

export class TraefikDashboardChart extends BitwardenAuthTokenChart {
  constructor(scope: Construct, id: string, props: TraefikDashboardChartProps) {
    const namespace = "traefik";
    super(scope, id, { ...props, namespace });

    const basicAuthSecret = new BitwardenOrgSecret(this, "basic-auth-secret", {
      namespace,
      name: "traefik-basic-auth",
      map: [
        {
          bwSecretId: "737269fb-cd4b-4a9d-a47d-b3b2017c5080",
          secretKeyName: "users",
        },
      ],
    });

    const basicAuthMiddleware = new Middleware(this, "auth", {
      metadata: {
        name: "traefik-dashboard-auth",
        namespace,
      },
      spec: {
        basicAuth: {
          secret: basicAuthSecret.name,
        },
      },
    });

    const slashMiddleware = new Middleware(this, "slash", {
      metadata: {
        name: "traefik-dashboard-slash",
        namespace,
      },
      spec: {
        redirectRegex: {
          regex: "^(.*)/dashboard$",
          replacement: "${1}/dashboard/",
          permanent: true,
        },
      },
    });

    const rootRedirectMiddleware = new Middleware(this, "root-redirect", {
      metadata: {
        name: "traefik-dashboard-root-redirect",
        namespace,
      },
      spec: {
        redirectRegex: {
          regex: "^https?://[^/]+/?$",
          replacement: "/dashboard/",
          permanent: true,
        },
      },
    });
    const certSecretName = "traefik-dashboard-tls";
    new Certificate(this, "cert", {
      metadata: {
        name: "traefik-dashboard-tls",
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
        annotations: {
          "gethomepage.dev/enabled": "true",
          "gethomepage.dev/name": "Traefik",
          "gethomepage.dev/description": "Reverse Proxy",
          "gethomepage.dev/group": "Admin",
          "gethomepage.dev/icon": "traefik.png",
          "gethomepage.dev/href": `https://${props.hosts[0]}`,
          "gethomepage.dev/pod-selector": "app.kubernetes.io/name=traefik",
        },
      },
      spec: {
        entryPoints: ["websecure"],
        routes: [
          {
            match: props.hosts.map((h) => `Host(\`${h}\`)`).join(" || "),
            kind: IngressRouteSpecRoutesKind.RULE,
            middlewares: [
              { name: basicAuthMiddleware.name },
              { name: rootRedirectMiddleware.name },
              { name: slashMiddleware.name },
            ],
            services: [
              {
                name: "api@internal",
                kind: IngressRouteSpecRoutesServicesKind.TRAEFIK_SERVICE,
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
