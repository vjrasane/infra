import { Construct } from "constructs";
import { Chart, ChartProps } from "cdk8s";
import { stringify as toYaml } from "yaml";
import {
  Namespace,
  ServiceAccount,
  ClusterRole,
  ClusterRoleBinding,
  ConfigMap,
  Deployment,
  Volume,
  ApiResource,
} from "cdk8s-plus-28";
import { needsCrowdsecProtection } from "../lib/hosts";
import { Certificate } from "../imports/cert-manager.io";
import {
  IngressRoute,
  IngressRouteSpecRoutesKind,
  IngressRouteSpecRoutesMiddlewares,
  IngressRouteSpecRoutesServicesKind,
  IngressRouteSpecRoutesServicesPort,
} from "../imports/traefik.io";

interface HomepageChartProps extends ChartProps {
  readonly hosts: string[];
  readonly clusterIssuerName: string;
}

export class HomepageChart extends Chart {
  constructor(scope: Construct, id: string, props: HomepageChartProps) {
    super(scope, id, { ...props });

    const namespace = "homepage";

    new Namespace(this, "namespace", {
      metadata: {
        name: namespace,
      },
    });

    const sa = new ServiceAccount(this, "sa", {
      metadata: {
        name: "homepage",
        namespace,
      },
    });

    const clusterRole = new ClusterRole(this, "cluster-role", {
      metadata: {
        name: "homepage",
      },
    });

    // Core resources
    clusterRole.allow(
      ["get", "list"],
      ApiResource.NAMESPACES,
      ApiResource.PODS,
      ApiResource.NODES,
    );

    // Ingresses
    clusterRole.allow(["get", "list"], ApiResource.INGRESSES);

    // Traefik IngressRoutes
    clusterRole.allow(
      ["get", "list"],
      ApiResource.custom({
        apiGroup: "traefik.io",
        resourceType: "ingressroutes",
      }),
    );

    // Metrics API
    clusterRole.allow(
      ["get", "list"],
      ApiResource.custom({ apiGroup: "metrics.k8s.io", resourceType: "nodes" }),
      ApiResource.custom({ apiGroup: "metrics.k8s.io", resourceType: "pods" }),
    );

    // CRD status
    clusterRole.allow(
      ["get"],
      ApiResource.custom({
        apiGroup: "apiextensions.k8s.io",
        resourceType: "customresourcedefinitions/status",
      }),
    );

    const crb = new ClusterRoleBinding(this, "cluster-role-binding", {
      metadata: {
        name: "homepage",
      },
      role: clusterRole,
    });
    crb.addSubjects(sa);

    const configData: Record<string, string> = {
      "kubernetes.yaml": toYaml({ mode: "cluster", traefik: true }),
      "settings.yaml": toYaml({
        title: "Home",
        headerStyle: "clean",
        layout: {
          Apps: {
            style: "row",
            columns: 3,
          },
          Admin: {
            style: "row",
            columns: 3,
          },
        },
      }),
      "widgets.yaml": toYaml([
        {
          kubernetes: {
            cluster: {
              show: true,
              cpu: true,
              memory: true,
              showLabel: true,
              label: "cluster",
            },
            nodes: {
              show: true,
              cpu: true,
              memory: true,
              showLabel: true,
            },
          },
        },
      ]),
      "services.yaml": toYaml([{ Apps: [] }, { Admin: [] }]),
      "bookmarks.yaml": "",
      "docker.yaml": "",
      "proxmox.yaml": "",
      "custom.css": "",
      "custom.js": "",
    };

    const configMap = new ConfigMap(this, "config", {
      metadata: {
        name: "homepage",
        namespace,
      },
      data: configData,
    });

    const configVolume = Volume.fromConfigMap(
      this,
      "config-volume",
      configMap,
      {
        name: "homepage-config",
      },
    );
    const logsVolume = Volume.fromEmptyDir(this, "logs-volume", "logs");

    const configFiles = Object.keys(configData);

    const deployment = new Deployment(this, "deployment", {
      metadata: {
        name: "homepage",
        namespace,
        labels: {
          "app.kubernetes.io/name": "homepage",
        },
      },
      podMetadata: {
        labels: {
          "app.kubernetes.io/name": "homepage",
        },
      },
      replicas: 1,
      serviceAccount: sa,
      automountServiceAccountToken: true,
      volumes: [configVolume, logsVolume],
      containers: [
        {
          name: "homepage",
          image: "ghcr.io/gethomepage/homepage:latest",
          portNumber: 3000,
          envVariables: {
            HOMEPAGE_ALLOWED_HOSTS: { value: props.hosts.join(",") },
          },
          securityContext: {
            ensureNonRoot: false,
          },
          volumeMounts: [
            ...configFiles.map((file) => ({
              path: `/app/config/${file}`,
              volume: configVolume,
              subPath: file,
            })),
            { path: "/app/config/logs", volume: logsVolume },
          ],
        },
      ],
    });

    const service = deployment.exposeViaService();

    const certSecretName = "homepage-tls"; // pragma: allowlist secret
    new Certificate(this, "cert", {
      metadata: {
        name: "homepage-tls",
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

    const crowdsecMiddleware: IngressRouteSpecRoutesMiddlewares = {
      name: "crowdsec-bouncer",
      namespace: "traefik",
    };

    new IngressRoute(this, "ingress", {
      metadata: {
        name: "homepage",
        namespace,
        annotations: {
          "gethomepage.dev/enabled": "true",
          "gethomepage.dev/name": "Homepage",
          "gethomepage.dev/description": "Dashboard",
          "gethomepage.dev/group": "Apps",
          "gethomepage.dev/icon": "homepage.png",
          "gethomepage.dev/href": `https://${props.hosts[0]}`,
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
