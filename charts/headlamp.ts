import { Construct } from "constructs";
import { Chart, ChartProps, Helm } from "cdk8s";
import { Namespace, ServiceAccount, ClusterRoleBinding, ClusterRole, Secret } from "cdk8s-plus-28";
import { Certificate } from "../imports/cert-manager.io";
import {
  IngressRoute,
  IngressRouteSpecRoutesKind,
  IngressRouteSpecRoutesServicesKind,
  IngressRouteSpecRoutesServicesPort,
} from "../imports/traefik.io";

interface HeadlampChartProps extends ChartProps {
  readonly hosts: string[];
  readonly clusterIssuerName: string;
}

export class HeadlampChart extends Chart {
  constructor(scope: Construct, id: string, props: HeadlampChartProps) {
    super(scope, id, { ...props });

    const namespace = "headlamp";

    new Namespace(this, "namespace", {
      metadata: {
        name: namespace,
      },
    });

    new Helm(this, "headlamp", {
      chart: "headlamp",
      repo: "https://kubernetes-sigs.github.io/headlamp/",
      namespace: namespace,
      releaseName: "headlamp",
    });

    // Admin service account for Headlamp authentication
    const adminSa = new ServiceAccount(this, "admin-sa", {
      metadata: {
        name: "headlamp-admin",
        namespace,
      },
    });

    const adminCrb = new ClusterRoleBinding(this, "admin-crb", {
      metadata: {
        name: "headlamp-admin",
      },
      role: ClusterRole.fromClusterRoleName(this, "cluster-admin", "cluster-admin"),
    });
    adminCrb.addSubjects(adminSa);

    // Long-lived token for the admin service account
    new Secret(this, "admin-token", {
      metadata: {
        name: "headlamp-admin-token",
        namespace,
        annotations: {
          "kubernetes.io/service-account.name": adminSa.name,
        },
      },
      type: "kubernetes.io/service-account-token",
    });

    const certSecretName = "headlamp-tls";
    new Certificate(this, "cert", {
      metadata: {
        name: "headlamp-tls",
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
        name: "headlamp",
        namespace,
        annotations: {
          "gethomepage.dev/enabled": "true",
          "gethomepage.dev/name": "Headlamp",
          "gethomepage.dev/description": "Kubernetes Dashboard",
          "gethomepage.dev/group": "Admin",
          "gethomepage.dev/icon": "headlamp.png",
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
                name: "headlamp",
                port: IngressRouteSpecRoutesServicesPort.fromNumber(80),
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
