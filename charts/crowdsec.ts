import { Construct } from "constructs";
import { ChartProps, Helm } from "cdk8s";
import { Namespace } from "cdk8s-plus-28";
import * as yaml from "yaml";
import { Middleware } from "../imports/traefik.io";
import { BitwardenAuthTokenChart, BitwardenOrgSecret } from "./bitwarden";

interface CrowdSecChartProps extends ChartProps {
  readonly traefikNamespace?: string;
}

export class CrowdSecChart extends BitwardenAuthTokenChart {
  readonly lapiServiceName = "crowdsec-service";
  readonly appsecServiceName = "crowdsec-appsec-service";
  readonly lapiPort = 8080;
  readonly appsecPort = 7422;
  readonly lapiHost: string;
  readonly appsecHost: string;

  constructor(scope: Construct, id: string, props: CrowdSecChartProps = {}) {
    const namespace = "crowdsec";
    super(scope, id, { ...props, namespace });

    const traefikNamespace = props.traefikNamespace ?? "traefik";

    new Namespace(this, "namespace", {
      metadata: { name: namespace },
    });

    this.lapiHost = `${this.lapiServiceName}.${namespace}.svc.cluster.local:${this.lapiPort}`;
    this.appsecHost = `${this.appsecServiceName}.${namespace}.svc.cluster.local:${this.appsecPort}`;

    const enrollKeySecretName = "crowdsec-enroll-key";
    new BitwardenOrgSecret(this, "enroll-key-secret", {
      metadata: { name: enrollKeySecretName, namespace },
      spec: {
        secretName: enrollKeySecretName,
        map: [
          {
            bwSecretId: "f5942111-76c3-4264-b738-b3df00ea77ca",
            secretKeyName: "enroll-key",
          },
        ],
      },
    });

    const bouncerKeySecretName = "crowdsec-bouncer-key";
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

    const consoleConfig = {
      share_manual_decisions: true,
      share_tainted: true,
      share_custom: true,
      share_context: true,
      console_management: true,
    };

    new Helm(this, "crowdsec", {
      chart: "crowdsec",
      repo: "https://crowdsecurity.github.io/helm-charts",
      namespace,
      releaseName: "crowdsec",
      values: {
        tests: { enabled: false },
        container_runtime: "containerd",
        config: {
          "console.yaml": yaml.stringify(consoleConfig),
        },
        lapi: {
          env: [
            {
              name: "ENROLL_KEY",
              valueFrom: {
                secretKeyRef: {
                  name: enrollKeySecretName,
                  key: "enroll-key",
                },
              },
            },
            { name: "ENROLL_INSTANCE_NAME", value: "k8s-cluster" },
            { name: "ENROLL_TAGS", value: "k8s linux traefik" },
          ],
          metrics: {
            enabled: true,
            serviceMonitor: {
              enabled: true,
            },
          },
        },
        appsec: {
          enabled: true,
          acquisitions: [
            {
              source: "appsec",
              listen_addr: `0.0.0.0:${this.appsecPort}`,
              path: "/",
              appsec_config: "crowdsecurity/virtual-patching",
              labels: { type: "appsec" },
            },
          ],
          env: [
            {
              name: "COLLECTIONS",
              value: "crowdsecurity/appsec-virtual-patching",
            },
          ],
        },
        agent: {
          acquisition: [
            {
              namespace: traefikNamespace,
              podName: "traefik-*",
              program: "traefik",
            },
          ],
          metrics: {
            enabled: true,
            serviceMonitor: {
              enabled: true,
            },
          },
        },
      },
    });

    new Middleware(this, "bouncer-middleware", {
      metadata: {
        name: "crowdsec-bouncer",
        namespace: traefikNamespace,
      },
      spec: {
        plugin: {
          "crowdsec-bouncer-traefik-plugin": {
            enabled: true,
            crowdsecMode: "stream",
            crowdsecAppsecEnabled: true,
            crowdsecAppsecHost: this.appsecHost,
            crowdsecLapiScheme: "http",
            crowdsecLapiHost: this.lapiHost,
            crowdsecLapiKeyFile: "/etc/traefik/crowdsec-bouncer-key/api-key",
            updateIntervalSeconds: 60,
          },
        },
      },
    });
  }
}
