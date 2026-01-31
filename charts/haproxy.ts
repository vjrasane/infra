import { Construct } from "constructs";
import { Chart, ChartProps } from "cdk8s";
import { Namespace, ConfigMap } from "cdk8s-plus-28";
import {
  KubeDaemonSet,
  NodeAffinity,
} from "cdk8s-plus-28/lib/imports/k8s";

interface HAProxyChartProps extends ChartProps {
  readonly traefikServiceHost: string;
  readonly traefikHttpPort?: number;
  readonly traefikHttpsPort?: number;
  readonly nodeAffinity?: NodeAffinity;
}

export class HAProxyChart extends Chart {
  constructor(scope: Construct, id: string, props: HAProxyChartProps) {
    super(scope, id, { ...props });

    const namespace = "haproxy";
    const httpPort = props.traefikHttpPort ?? 80;
    const httpsPort = props.traefikHttpsPort ?? 443;

    new Namespace(this, "namespace", {
      metadata: { name: namespace },
    });

    const configMapName = "haproxy-config";
    new ConfigMap(this, "config", {
      metadata: { name: configMapName, namespace },
      data: {
        "haproxy.cfg": `
global
    log stdout format raw local0

defaults
    mode tcp
    log global
    option tcplog
    timeout connect 5s
    timeout client 30s
    timeout server 30s

frontend http
    bind *:80
    default_backend traefik_http

frontend https
    bind *:443
    default_backend traefik_https

backend traefik_http
    server traefik ${props.traefikServiceHost.replace(/\.?$/, ".")}:${httpPort} check

backend traefik_https
    server traefik ${props.traefikServiceHost.replace(/\.?$/, ".")}:${httpsPort} check
`,
      },
    });

    const podLabels = { "app.kubernetes.io/name": "haproxy" };

    new KubeDaemonSet(this, "haproxy", {
      metadata: { name: "haproxy", namespace, labels: podLabels },
      spec: {
        selector: { matchLabels: podLabels },
        template: {
          metadata: { labels: podLabels },
          spec: {
            hostNetwork: true,
            dnsPolicy: "ClusterFirstWithHostNet",
            affinity: props.nodeAffinity
              ? { nodeAffinity: props.nodeAffinity }
              : undefined,
            containers: [
              {
                name: "haproxy",
                image: "haproxy:2.9-alpine",
                args: ["-f", "/usr/local/etc/haproxy/haproxy.cfg"],
                ports: [
                  { containerPort: 80, protocol: "TCP", name: "http" },
                  { containerPort: 443, protocol: "TCP", name: "https" },
                ],
                volumeMounts: [
                  {
                    name: "config",
                    mountPath: "/usr/local/etc/haproxy",
                    readOnly: true,
                  },
                ],
                securityContext: {
                  capabilities: {
                    add: ["NET_BIND_SERVICE"],
                    drop: ["ALL"],
                  },
                  runAsUser: 0,
                  runAsGroup: 0,
                },
              },
            ],
            volumes: [
              {
                name: "config",
                configMap: { name: configMapName },
              },
            ],
          },
        },
      },
    });
  }
}
