import { Construct } from "constructs";
import { Cron, ChartProps } from "cdk8s";
import {
  Namespace,
  CronJob,
  ServiceAccount,
  Role,
  RoleBinding,
  ApiResource,
} from "cdk8s-plus-28";
import * as yaml from "yaml";
import { Crowdsec } from "../imports/crowdsec";
import { Middleware } from "../imports/traefik.io";
import { BitwardenAuthTokenChart, BitwardenOrgSecret } from "./bitwarden";

interface CrowdSecChartProps extends ChartProps {
  readonly traefikNamespace?: string;
  readonly blockedCountries?: string[];
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

    const enrollSecret = new BitwardenOrgSecret(this, "enroll-key-secret", {
      namespace,
      name: "crowdsec-enroll-key",
      map: [
        {
          bwSecretId: "f5942111-76c3-4264-b738-b3df00ea77ca",
          secretKeyName: "enroll-key",
        },
      ],
    });

    const blockedCountries = props.blockedCountries ?? [];

    const consoleConfig = {
      share_manual_decisions: true,
      share_tainted: true,
      share_custom: true,
      share_context: true,
      console_management: true,
    };

    new Crowdsec(this, "crowdsec", {
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
                  name: enrollSecret.name,
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
          env: [
            {
              name: "PARSERS",
              value: "crowdsecurity/geoip-enrich",
            },
          ],
          metrics: {
            enabled: true,
            serviceMonitor: {
              enabled: true,
            },
          },
        },
      } as any,
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
            crowdsecAppsecUnreachableBlock: false,
            crowdsecAppsecFailureBlock: false,
            crowdsecLapiScheme: "http",
            crowdsecLapiHost: this.lapiHost,
            crowdsecLapiKeyFile: "/etc/traefik/crowdsec-bouncer-key/api-key",
            updateMaxFailure: -1,
            updateIntervalSeconds: 60,
            forwardedHeadersTrustedIPs: "10.42.0.0/16",
          },
        },
      },
    });

    if (blockedCountries.length > 0) {
      const geoBlockSa = new ServiceAccount(this, "geo-block-sa", {
        metadata: { name: "crowdsec-geo-block", namespace },
      });

      const geoBlockRole = new Role(this, "geo-block-role", {
        metadata: { name: "crowdsec-geo-block", namespace },
      });
      geoBlockRole.allow(["get", "list"], ApiResource.PODS);
      geoBlockRole.allow(
        ["create"],
        ApiResource.custom({ apiGroup: "", resourceType: "pods/exec" }),
      );
      geoBlockRole.allow(
        ["get"],
        ApiResource.custom({ apiGroup: "apps", resourceType: "deployments" }),
      );

      new RoleBinding(this, "geo-block-rolebinding", {
        metadata: { name: "crowdsec-geo-block", namespace },
        role: geoBlockRole,
      }).addSubjects(geoBlockSa);

      const cscliCommands = blockedCountries
        .map(
          (c) =>
            `cscli decisions add --scope Country --value ${c} --duration 8760h --reason geo-block`,
        )
        .join(" && ");

      new CronJob(this, "geo-block-cronjob", {
        metadata: { name: "crowdsec-geo-block", namespace },
        schedule: Cron.schedule({ minute: "0", hour: "0", day: "1" }), // 1st of month
        successfulJobsRetained: 1,
        failedJobsRetained: 1,
        serviceAccount: geoBlockSa,
        automountServiceAccountToken: true,
        containers: [
          {
            name: "geo-block",
            image: "bitnami/kubectl:latest",
            command: ["/bin/sh", "-c"],
            args: [
              `kubectl exec -n ${namespace} deploy/crowdsec-lapi -- sh -c "${cscliCommands}" && echo "Geo-block decisions refreshed"`,
            ],
            securityContext: {
              ensureNonRoot: false,
              readOnlyRootFilesystem: false,
            },
          },
        ],
      });
    }
  }
}
