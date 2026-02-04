import { Construct } from "constructs";
import { Certificate } from "../imports/cert-manager.io";
import {
  IngressRoute,
  IngressRouteProps,
  IngressRouteSpecRoutesKind,
  IngressRouteSpecRoutesServices,
} from "../imports/traefik.io";
import { getPublicSecurityMiddlewares } from "./hosts";

interface SecureIngressRouteProps {
  readonly namespace: string;
  readonly name?: string;
  readonly hosts: string[];
  readonly metadata?: IngressRouteProps["metadata"];
  readonly services: IngressRouteSpecRoutesServices[];
}

export const CLUSTER_ISSUER_NAME = "cloudflare-issuer";

export class SecureIngressRoute extends Construct {
  constructor(scope: Construct, id: string, props: SecureIngressRouteProps) {
    super(scope, id);

    const { namespace, hosts, services } = props;
    const name = props.name ?? namespace;

    const secretName = `${name}-tls-secret`;
    new Certificate(this, "certificate", {
      metadata: { name: name, namespace },
      spec: {
        secretName,
        issuerRef: {
          name: CLUSTER_ISSUER_NAME,
          kind: "ClusterIssuer",
        },
        dnsNames: hosts,
      },
    });

    // IngressRoute
    new IngressRoute(this, "ingress", {
      metadata: {
        name,
        namespace,
        ...props.metadata,
        // annotations: {
        //   "gethomepage.dev/enabled": "true",
        //   "gethomepage.dev/name": "Planka",
        //   "gethomepage.dev/description": "Project Management",
        //   "gethomepage.dev/group": "Apps",
        //   "gethomepage.dev/icon": "planka.png",
        //   "gethomepage.dev/href": `https://${props.hosts[0]}`,
        //   "gethomepage.dev/pod-selector": "app.kubernetes.io/name=planka",
        // },
      },
      spec: {
        entryPoints: ["websecure"],
        routes: [
          {
            match: props.hosts.map((h) => `Host(\`${h}\`)`).join(" || "),
            kind: IngressRouteSpecRoutesKind.RULE,
            middlewares: getPublicSecurityMiddlewares(props.hosts),
            services,
          },
        ],
        tls: { secretName },
      },
    });
  }
}
