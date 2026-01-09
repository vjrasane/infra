import { Construct } from "constructs";
import { Chart, ChartProps, Helm, Include } from "cdk8s";
import { Namespace } from "cdk8s-plus-28";

interface TraefikChartProps extends ChartProps {
  readonly nodes: string[];
  readonly values?: Record<string, unknown>;
}

export class TraefikChart extends Chart {
  constructor(scope: Construct, id: string, props: TraefikChartProps) {
    super(scope, id, { ...props });

    const namespace = "traefik";

    new Namespace(this, "namespace", {
      metadata: {
        name: namespace,
      },
    });

    // Traefik CRDs (IngressRoute, Middleware, etc.)
    new Include(this, "crds", {
      url: "https://raw.githubusercontent.com/traefik/traefik/v3.3/docs/content/reference/dynamic-configuration/kubernetes-crd-definition-v1.yml",
    });

    new Helm(this, "traefik", {
      chart: "traefik",
      repo: "https://traefik.github.io/charts",
      namespace: namespace,
      releaseName: "traefik",
      helmFlags: ["--skip-crds"],
      values: {
        deployment: {
          kind: "DaemonSet",
        },
        updateStrategy: {
          rollingUpdate: {
            maxUnavailable: 1,
            maxSurge: 0,
          },
        },
        affinity: {
          nodeAffinity: {
            requiredDuringSchedulingIgnoredDuringExecution: {
              nodeSelectorTerms: [
                {
                  matchExpressions: [
                    {
                      key: "kubernetes.io/hostname",
                      operator: "In",
                      values: props.nodes,
                    },
                  ],
                },
              ],
            },
          },
        },
        hostNetwork: true,
        securityContext: {
          capabilities: {
            add: ["NET_BIND_SERVICE"],
            drop: ["ALL"],
          },
          readOnlyRootFilesystem: true,
        },
        podSecurityContext: {
          runAsNonRoot: false,
          runAsUser: 0,
          runAsGroup: 0,
        },
        ports: {
          web: {
            port: 80,
            redirections: {
              entryPoint: {
                to: "websecure",
                scheme: "https",
                permanent: true,
              },
            },
          },
          websecure: {
            port: 443,
          },
        },
        ...props.values,
      },
    });
  }
}
