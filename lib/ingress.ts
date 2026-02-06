import { Service } from "cdk8s-plus-28";
import { Construct } from "constructs";
import { omitBy, isNil } from "lodash/fp";
import { Certificate } from "../imports/cert-manager.io";
import {
  IngressRoute,
  IngressRouteProps,
  IngressRouteSpecRoutesKind,
  IngressRouteSpecRoutesServices,
  IngressRouteSpecRoutesServicesKind,
  IngressRouteSpecRoutesServicesPort,
} from "../imports/traefik.io";
import { getPublicSecurityMiddlewares } from "./hosts";

interface SecureIngressRouteProps extends SecureIngressRouteFromServiceProps {
  readonly services: IngressRouteSpecRoutesServices[];
}

interface SecureIngressRouteFromServiceProps {
  readonly namespace?: string;
  readonly name?: string;
  readonly secretName?: string;
  readonly hosts: string[];
  readonly metadata?: IngressRouteProps["metadata"];
}

export const CLUSTER_ISSUER_NAME = "cloudflare-issuer";

export class SecureIngressRoute extends Construct {
  constructor(scope: Construct, id: string, props: SecureIngressRouteProps) {
    super(scope, id);

    const { namespace, hosts, services } = props;
    const name = props.name ?? namespace;

    const secretName = props.secretName ?? `${name ?? this.node.id}-tls-secret`;
    new Certificate(this, "certificate", {
      metadata: omitBy(isNil, { name, namespace }),
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
      metadata: omitBy(isNil, {
        name,
        namespace,
        ...props.metadata,
      }),
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

  static fromService = (
    scope: Construct,
    id: string,
    service: Service,
    props: SecureIngressRouteFromServiceProps,
  ) => {
    return new SecureIngressRoute(scope, id, {
      ...props,
      services: [
        {
          name: service.name,
          port: IngressRouteSpecRoutesServicesPort.fromNumber(service.port),
          kind: IngressRouteSpecRoutesServicesKind.SERVICE,
        },
      ],
    });
  };
}
