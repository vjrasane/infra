import { Construct } from "constructs";
import { ChartProps } from "cdk8s";
import { ConfigMap, Namespace } from "cdk8s-plus-28";
import { Vector } from "../imports/vector";
import { NodeAffinity } from "cdk8s-plus-28/lib/imports/k8s";
import { getPublicSecurityMiddlewares } from "../lib/hosts";
import { Certificate } from "../imports/cert-manager.io";
import {
  ServiceMonitor,
  ServiceMonitorSpecEndpointsMetricRelabelingsAction,
} from "../imports/monitoring.coreos.com";
import {
  IngressRoute,
  IngressRouteSpecRoutesKind,
  IngressRouteSpecRoutesServicesKind,
  IngressRouteSpecRoutesServicesPort,
} from "../imports/traefik.io";
import { BitwardenAuthTokenChart, BitwardenOrgSecret } from "./bitwarden";

interface VectorChartProps extends ChartProps {
  readonly hosts: string[];
  readonly clusterIssuerName: string;
  readonly nodeAffinity?: NodeAffinity;
  readonly lokiPushUrl?: string;
}

export class VectorChart extends BitwardenAuthTokenChart {
  constructor(scope: Construct, id: string, props: VectorChartProps) {
    const namespace = "vector";
    super(scope, id, { ...props, namespace });

    new Namespace(this, "namespace", {
      metadata: { name: namespace },
    });

    const webhookSecret = new BitwardenOrgSecret(this, "webhook-secret", {
      namespace,
      name: "vector-webhook",
      map: [
        {
          bwSecretId: "981aa902-ac2c-4a5a-833c-b3de0076c096",
          secretKeyName: "token",
        },
      ],
    });

    const vectorConfig = {
      sources: {
        brewapi: {
          type: "http_server",
          address: "0.0.0.0:8080",
          path: "/brewapi",
          decoding: { codec: "json" },
          query_parameters: ["token"],
        },
      },
      transforms: {
        auth: {
          type: "filter",
          inputs: ["brewapi"],
          condition: '.token == "${WEBHOOK_TOKEN}"',
        },
        sanitize_for_logs: {
          type: "remap",
          inputs: ["auth"],
          source: "del(.token); del(.path); del(.source_type)",
        },
        to_metrics: {
          type: "log_to_metric",
          inputs: ["auth"],
          metrics: [
            {
              type: "gauge",
              field: "temp",
              name: "temperature",
              namespace: "brew",
              tags: {
                name: "{{name}}",
                unit: "{{temp_unit}}",
              },
            },
            {
              type: "gauge",
              field: "gravity",
              name: "gravity",
              namespace: "brew",
              tags: {
                name: "{{name}}",
              },
            },
          ],
        },
      },
      sinks: {
        prometheus: {
          type: "prometheus_exporter",
          inputs: ["to_metrics"],
          address: "0.0.0.0:9598",
        },
        ...(props.lokiPushUrl && {
          loki: {
            type: "loki",
            inputs: ["sanitize_for_logs"],
            endpoint: props.lokiPushUrl.replace("/loki/api/v1/push", ""),
            labels: {
              source: "brewapi",
            },
            encoding: {
              codec: "json",
            },
          },
        }),
      },
    };

    new ConfigMap(this, "config", {
      metadata: { name: "vector-config", namespace },
      data: {
        "vector.yaml": JSON.stringify(vectorConfig),
      },
    });

    new Vector(this, "vector", {
      namespace,
      releaseName: "vector",
      values: {
        role: "Stateless-Aggregator",
        existingConfigMaps: ["vector-config"],
        dataDir: "/vector-data-dir",
        affinity: props.nodeAffinity
          ? { nodeAffinity: props.nodeAffinity }
          : {},
        env: [
          {
            name: "WEBHOOK_TOKEN",
            valueFrom: {
              secretKeyRef: {
                name: webhookSecret.name,
                key: "token",
              },
            },
          },
        ],
        service: {
          ports: [
            { name: "webhook", port: 8080, protocol: "TCP" },
            { name: "prometheus", port: 9598, protocol: "TCP" },
          ],
        },
      },
    });

    const certSecretName = "vector-webhook-tls";
    new Certificate(this, "cert", {
      metadata: { name: "vector-webhook-tls", namespace },
      spec: {
        secretName: certSecretName,
        issuerRef: { name: props.clusterIssuerName, kind: "ClusterIssuer" },
        dnsNames: props.hosts,
      },
    });

    new IngressRoute(this, "ingress", {
      metadata: { name: "vector-webhook", namespace },
      spec: {
        entryPoints: ["websecure"],
        routes: [
          {
            match: props.hosts.map((h) => `Host(\`${h}\`)`).join(" || "),
            kind: IngressRouteSpecRoutesKind.RULE,
            middlewares: getPublicSecurityMiddlewares(props.hosts),
            services: [
              {
                name: "vector",
                port: IngressRouteSpecRoutesServicesPort.fromNumber(8080),
                kind: IngressRouteSpecRoutesServicesKind.SERVICE,
              },
            ],
          },
        ],
        tls: { secretName: certSecretName },
      },
    });

    new ConfigMap(this, "brew-dashboard", {
      metadata: {
        name: "brew-dashboard",
        namespace,
        labels: {
          grafana_dashboard: "1",
        },
        annotations: {
          grafana_folder: "Brew",
        },
      },
      data: {
        "brew-dashboard.json": JSON.stringify({
          title: "Brew Monitoring",
          uid: "brew",
          schemaVersion: 30,
          refresh: "30s",
          time: { from: "now-24h", to: "now" },
          panels: [
            {
              id: 1,
              title: "Temperature",
              type: "stat",
              gridPos: { x: 0, y: 0, w: 4, h: 4 },
              targets: [
                {
                  refId: "A",
                  expr: 'max by (name) (last_over_time(brew_temperature{job="vector",name!~"test.*"}[75m]))',
                  legendFormat: "{{name}}",
                  datasource: { type: "prometheus", uid: "prometheus" },
                },
              ],
              options: { colorMode: "value", graphMode: "none" },
              fieldConfig: { defaults: { unit: "celsius" } },
            },
            {
              id: 2,
              title: "Gravity",
              type: "stat",
              gridPos: { x: 0, y: 4, w: 4, h: 4 },
              targets: [
                {
                  refId: "A",
                  expr: 'max by (name) (last_over_time(brew_gravity{job="vector",name!~"test.*"}[75m]))',
                  legendFormat: "{{name}}",
                  datasource: { type: "prometheus", uid: "prometheus" },
                },
              ],
              options: { colorMode: "value", graphMode: "none" },
              fieldConfig: { defaults: { decimals: 3 } },
            },
            {
              id: 3,
              title: "Temperature Over Time",
              type: "timeseries",
              gridPos: { x: 4, y: 0, w: 10, h: 8 },
              targets: [
                {
                  refId: "A",
                  expr: 'max by (name) (last_over_time(brew_temperature{job="vector",name!~"test.*"}[75m]))',
                  legendFormat: "{{name}}",
                  datasource: { type: "prometheus", uid: "prometheus" },
                },
              ],
              fieldConfig: {
                defaults: {
                  unit: "celsius",
                  custom: {
                    drawStyle: "line",
                    lineInterpolation: "smooth",
                    lineWidth: 2,
                    showPoints: "never",
                    spanNulls: true,
                  },
                },
              },
            },
            {
              id: 4,
              title: "Gravity Over Time",
              type: "timeseries",
              gridPos: { x: 14, y: 0, w: 10, h: 8 },
              targets: [
                {
                  refId: "A",
                  expr: 'max by (name) (last_over_time(brew_gravity{job="vector",name!~"test.*"}[75m]))',
                  legendFormat: "{{name}}",
                  datasource: { type: "prometheus", uid: "prometheus" },
                },
              ],
              fieldConfig: {
                defaults: {
                  decimals: 3,
                  custom: {
                    drawStyle: "line",
                    lineInterpolation: "smooth",
                    lineWidth: 2,
                    showPoints: "never",
                    spanNulls: true,
                  },
                },
              },
            },
            {
              id: 5,
              title: "Recent Logs",
              type: "logs",
              gridPos: { x: 0, y: 18, w: 24, h: 8 },
              targets: [
                {
                  refId: "A",
                  expr: '{source="brewapi"} | json | name!~"test.*"',
                  datasource: { type: "loki", uid: "loki" },
                },
              ],
              options: {
                showTime: true,
                showLabels: false,
                showCommonLabels: false,
                wrapLogMessage: true,
                prettifyLogMessage: true,
                enableLogDetails: true,
                sortOrder: "Descending",
              },
            },
          ],
        }),
      },
    });

    new ServiceMonitor(this, "service-monitor", {
      metadata: { name: "vector", namespace },
      spec: {
        selector: {
          matchLabels: {
            "app.kubernetes.io/instance": "vector",
            "app.kubernetes.io/name": "vector",
          },
        },
        endpoints: [
          {
            port: "prometheus",
            interval: "30s",
            metricRelabelings: [
              {
                sourceLabels: ["job"],
                regex: ".*-headless",
                action: ServiceMonitorSpecEndpointsMetricRelabelingsAction.DROP,
              },
            ],
          },
        ],
      },
    });
  }
}
