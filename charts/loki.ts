import { Construct } from "constructs";
import { Chart, ChartProps, Helm } from "cdk8s";
import { NodeAffinity } from "cdk8s-plus-28/lib/imports/k8s";

interface LokiChartProps extends ChartProps {
  readonly nodeAffinity?: NodeAffinity;
}

export class LokiChart extends Chart {
  readonly serviceName = "loki";
  readonly servicePort = 3100;
  readonly pushUrl: string;

  constructor(scope: Construct, id: string, props: LokiChartProps) {
    super(scope, id, { ...props });

    const namespace = "monitoring";

    this.pushUrl = `http://${this.serviceName}.${namespace}.svc.cluster.local:${this.servicePort}/loki/api/v1/push`;

    new Helm(this, "loki", {
      chart: "loki",
      repo: "https://grafana.github.io/helm-charts",
      namespace,
      releaseName: "loki",
      values: {
        deploymentMode: "SingleBinary",
        loki: {
          auth_enabled: false,
          commonConfig: {
            replication_factor: 1,
          },
          schemaConfig: {
            configs: [
              {
                from: "2024-01-01",
                store: "tsdb",
                object_store: "filesystem",
                schema: "v13",
                index: {
                  prefix: "index_",
                  period: "24h",
                },
              },
            ],
          },
          storage: {
            type: "filesystem",
          },
          compactor: {
            retention_enabled: false,
          },
        },
        singleBinary: {
          replicas: 1,
          affinity: props.nodeAffinity
            ? { nodeAffinity: props.nodeAffinity }
            : {},
          persistence: {
            enabled: true,
            size: "10Gi",
          },
        },
        gateway: {
          enabled: false,
        },
        backend: {
          replicas: 0,
        },
        read: {
          replicas: 0,
        },
        write: {
          replicas: 0,
        },
        chunksCache: {
          enabled: false,
        },
        resultsCache: {
          enabled: false,
        },
        lokiCanary: {
          enabled: false,
        },
        test: {
          enabled: false,
        },
        sidecar: {
          rules: {
            enabled: false,
          },
        },
      },
    });
  }
}
