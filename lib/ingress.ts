import { Service } from "cdk8s-plus-28";
import { Construct } from "constructs";
import { omitBy, isNil } from "lodash/fp";
import { Certificate as CertManagerCertificate } from "../imports/cert-manager.io";
import {
  IngressRoute,
  IngressRouteProps,
  IngressRouteSpecRoutes,
  IngressRouteSpecRoutesKind,
  IngressRouteSpecRoutesMiddlewares,
  IngressRouteSpecRoutesServices,
  IngressRouteSpecRoutesServicesKind,
  IngressRouteSpecRoutesServicesPort,
  Middleware,
} from "../imports/traefik.io";
import { getPublicSecurityMiddlewares } from "./hosts";

export const CLUSTER_ISSUER_NAME = "cloudflare-issuer";

interface CertificateProps {
  readonly namespace?: string;
  readonly name?: string;
  readonly secretName: string;
  readonly hosts: string[];
}

export class Certificate extends CertManagerCertificate {
  constructor(scope: Construct, id: string, props: CertificateProps) {
    const { namespace, hosts, secretName } = props;
    const name = props.name ?? namespace;

    super(scope, id, {
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
  }
}
interface SecureIngressRouteProps extends SecureIngressRouteFromServiceProps {
  readonly routes: IngressRouteSpecRoutes[];
}

interface SecureIngressRouteFromServiceProps {
  readonly namespace?: string;
  readonly name?: string;
  readonly secretName?: string;
  readonly hosts: string[];
  readonly metadata?: IngressRouteProps["metadata"];
  readonly middlewares?: IngressRouteSpecRoutesMiddlewares[];
}

interface CreateRouteOpts {
  middlewares?: IngressRouteSpecRoutesMiddlewares[];
  pathPrefix?: string;
}

export class SecureIngressRoute extends Construct {
  constructor(scope: Construct, id: string, props: SecureIngressRouteProps) {
    super(scope, id);

    const { namespace, hosts, routes } = props;
    const name = props.name ?? namespace;

    const secretName = props.secretName ?? `${name ?? id}-tls-secret`;
    new Certificate(this, "certificate", {
      name,
      namespace,
      hosts,
      secretName,
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
        routes,
        tls: { secretName },
      },
    });
  }

  static createRoute = (
    hosts: string[],
    services: IngressRouteSpecRoutesServices[],
    opts?: CreateRouteOpts,
  ) => {
    const hostsMatch = hosts.map((h) => `Host(\`${h}\`)`).join(" || ");
    const match = opts?.pathPrefix
      ? `PathPrefix(\`${opts.pathPrefix}\`) && (${hostsMatch})`
      : hostsMatch;
    return {
      match,
      kind: IngressRouteSpecRoutesKind.RULE,
      middlewares: opts?.middlewares ?? getPublicSecurityMiddlewares(hosts),
      services,
    };
  };

  static fromService = (
    scope: Construct,
    id: string,
    service: Service,
    props: SecureIngressRouteFromServiceProps,
  ) => {
    return new SecureIngressRoute(scope, id, {
      ...props,
      routes: [
        SecureIngressRoute.createRoute(
          props.hosts,
          [
            {
              name: service.name,
              port: IngressRouteSpecRoutesServicesPort.fromNumber(service.port),
              kind: IngressRouteSpecRoutesServicesKind.SERVICE,
            },
          ],
          { middlewares: props.middlewares },
        ),
      ],
    });
  };
}

const TRAEFIK_AUTH_OUTPOST_ADDRESS =
  "http://ak-outpost-authentik-embedded-outpost.authentik.svc.cluster.local:9000/outpost.goauthentik.io/auth/traefik";

interface AuthMiddlewareProps {
  name?: string;
  namespace?: string;
}

export class AuthMiddleware extends Middleware {
  constructor(scope: Construct, id: string, props: AuthMiddlewareProps = {}) {
    const { name, namespace } = props;
    super(scope, id, {
      metadata: omitBy(isNil, { name, namespace }),
      spec: {
        forwardAuth: {
          address: TRAEFIK_AUTH_OUTPOST_ADDRESS,
          trustForwardHeader: true,
          authResponseHeaders: [
            "X-authentik-username",
            "X-authentik-groups",
            "X-authentik-email",
            "X-authentik-name",
            "X-authentik-uid",
          ],
        },
      },
    });
  }
}
