import { Construct } from "constructs";
import { ChartProps, Helm } from "cdk8s";
import { ConfigMap, Namespace } from "cdk8s-plus-28";
import { NodeAffinity } from "cdk8s-plus-28/lib/imports/k8s";
import { Certificate } from "../imports/cert-manager.io";
import { ServiceMonitor } from "../imports/monitoring.coreos.com";
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
}

export class VectorChart extends BitwardenAuthTokenChart {
  constructor(scope: Construct, id: string, props: VectorChartProps) {
    const namespace = "vector";
    super(scope, id, { ...props, namespace });

    new Namespace(this, "namespace", {
      metadata: { name: namespace },
    });

    const secretName = "vector-webhook";
    new BitwardenOrgSecret(this, "webhook-secret", {
      metadata: { name: secretName, namespace },
      spec: {
        secretName,
        map: [
          {
            bwSecretId: "981aa902-ac2c-4a5a-833c-b3de0076c096",
            secretKeyName: "token",
          },
        ],
      },
    });

    const vectorConfig = {
      sources: {
        webhook: {
          type: "http_server",
          address: "0.0.0.0:8080",
          path: "/webhook",
          decoding: { codec: "json" },
          query_parameters: ["token"],
        },
      },
      transforms: {
        auth: {
          type: "filter",
          inputs: ["webhook"],
          condition: '.token == "${WEBHOOK_TOKEN}"',
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
      },
    };

    new ConfigMap(this, "config", {
      metadata: { name: "vector-config", namespace },
      data: {
        "vector.yaml": JSON.stringify(vectorConfig),
      },
    });

    new Helm(this, "vector", {
      chart: "vector",
      repo: "https://helm.vector.dev",
      namespace,
      releaseName: "vector",
      values: {
        role: "Stateless-Aggregator",
        existingConfigMaps: ["vector-config"],
        dataDir: "/vector-data-dir",
        affinity: props.nodeAffinity ? { nodeAffinity: props.nodeAffinity } : {},
        env: [
          {
            name: "WEBHOOK_TOKEN",
            valueFrom: {
              secretKeyRef: {
                name: secretName,
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
          },
        ],
      },
    });
  }
}
