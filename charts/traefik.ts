import { Construct } from "constructs";
import { ChartProps, Helm, Include } from "cdk8s";
import { Namespace } from "cdk8s-plus-28";
import { BitwardenAuthTokenChart, BitwardenOrgSecret } from "./bitwarden";

interface TraefikChartProps extends ChartProps {
  readonly values?: Record<string, unknown>;
  readonly crowdsecBouncerEnabled?: boolean;
}

export class TraefikChart extends BitwardenAuthTokenChart {
  constructor(scope: Construct, id: string, props: TraefikChartProps = {}) {
    const namespace = "traefik";
    super(scope, id, { ...props, namespace });

    new Namespace(this, "namespace", {
      metadata: {
        name: namespace,
      },
    });

    // Traefik CRDs (IngressRoute, Middleware, etc.)
    new Include(this, "crds", {
      url: "https://raw.githubusercontent.com/traefik/traefik/v3.3/docs/content/reference/dynamic-configuration/kubernetes-crd-definition-v1.yml",
    });

    const bouncerKeySecretName = "crowdsec-bouncer-key";
    const crowdsecPlugin = props.crowdsecBouncerEnabled
      ? (() => {
          new BitwardenOrgSecret(this, "bouncer-key-secret", {
            metadata: { name: bouncerKeySecretName, namespace },
            spec: {
              secretName: bouncerKeySecretName,
              map: [
                {
                  bwSecretId: "e462ab7b-f219-4fd9-b8c0-b3df00ea0e48",
                  secretKeyName: "api-key",
                },
              ],
            },
          });
          return {
            experimental: {
              plugins: {
                "crowdsec-bouncer-traefik-plugin": {
                  moduleName:
                    "github.com/maxlerebourg/crowdsec-bouncer-traefik-plugin",
                  version: "v1.3.5",
                },
              },
            },
            volumes: [
              {
                name: bouncerKeySecretName,
                mountPath: "/etc/traefik/crowdsec-bouncer-key",
                type: "secret",
              },
            ],
          };
        })()
      : {};

    new Helm(this, "traefik", {
      chart: "traefik",
      repo: "https://traefik.github.io/charts",
      namespace: namespace,
      releaseName: "traefik",
      helmFlags: ["--skip-crds"],
      values: {
        autoscaling: {
          enabled: true,
          minReplicas: 2,
          maxReplicas: 5,
          metrics: [
            {
              type: "Resource",
              resource: {
                name: "cpu",
                target: {
                  type: "Utilization",
                  averageUtilization: 80,
                },
              },
            },
          ],
        },
        service: {
          type: "ClusterIP",
        },
        providers: {
          kubernetesCRD: {
            allowCrossNamespace: true,
          },
        },
        ports: {
          metrics: {
            port: 9101,
            exposedPort: 9101,
          },
          web: {
            port: 80,
            http: {
              redirections: {
                entryPoint: {
                  to: "websecure",
                  scheme: "https",
                  permanent: true,
                },
              },
            },
          },
          websecure: {
            port: 443,
          },
        },
        ...crowdsecPlugin,
        ...props.values,
      },
    });
  }
}
