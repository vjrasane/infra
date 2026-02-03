import { Construct } from "constructs";
import { Chart, ChartProps } from "cdk8s";
import {
  Namespace,
  ConfigMap,
  DaemonSet,
  DnsPolicy,
  Protocol,
  Volume,
  Capability,
  LabeledNode,
} from "cdk8s-plus-28";

interface HAProxyChartProps extends ChartProps {
  readonly traefikServiceHost: string;
  readonly traefikHttpPort?: number;
  readonly traefikHttpsPort?: number;

  readonly nodes?: LabeledNode[];
}

export class HAProxyChart extends Chart {
  constructor(scope: Construct, id: string, props: HAProxyChartProps) {
    super(scope, id, { ...props });

    const { nodes = [] } = props;

    const namespace = "haproxy";
    const httpPort = props.traefikHttpPort ?? 80;
    const httpsPort = props.traefikHttpsPort ?? 443;

    new Namespace(this, "namespace", {
      metadata: { name: namespace },
    });

    const configMap = new ConfigMap(this, "config", {
      metadata: { name: "haproxy-config", namespace },
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

    const configVolume = Volume.fromConfigMap(this, "config-volume", configMap);

    const daemonSet = new DaemonSet(this, "haproxy", {
      metadata: { name: "haproxy", namespace },
      select: true,
      hostNetwork: true,
      dns: {
        policy: DnsPolicy.CLUSTER_FIRST_WITH_HOST_NET,
      },
      securityContext: {
        ensureNonRoot: false,
        user: 0,
        group: 0,
      },
      containers: [
        {
          name: "haproxy",
          image: "haproxy:2.9-alpine",
          args: ["-f", "/usr/local/etc/haproxy/haproxy.cfg"],
          ports: [
            { number: 80, protocol: Protocol.TCP, name: "http" },
            { number: 443, protocol: Protocol.TCP, name: "https" },
          ],
          volumeMounts: [
            {
              volume: configVolume,
              path: "/usr/local/etc/haproxy",
              readOnly: true,
            },
          ],
          securityContext: {
            ensureNonRoot: false,
            capabilities: {
              add: [Capability.NET_BIND_SERVICE],
              drop: [Capability.ALL],
            },
          },
        },
      ],
      volumes: [configVolume],
    });

    for (let node of nodes) {
      daemonSet.scheduling.attract(node);
    }
  }
}
