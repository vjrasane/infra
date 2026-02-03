import { Construct } from "constructs";
import { ChartProps, Include } from "cdk8s";
import { Namespace } from "cdk8s-plus-28";
import { Kubeprometheusstack } from "../imports/kube-prometheus-stack";
import { NodeAffinity } from "cdk8s-plus-28/lib/imports/k8s";
import { getPublicSecurityMiddlewares } from "../lib/hosts";
import { Certificate } from "../imports/cert-manager.io";
import {
  IngressRoute,
  IngressRouteSpecRoutesKind,
  IngressRouteSpecRoutesServicesKind,
  IngressRouteSpecRoutesServicesPort,
} from "../imports/traefik.io";
import { BitwardenAuthTokenChart, BitwardenOrgSecret } from "./bitwarden";

interface KubePrometheusStackChartProps extends ChartProps {
  readonly grafanaHosts: string[];
  readonly grafanaRootUrl: string;
  readonly authentikUrl: string;
  readonly prometheusHosts: string[];
  readonly alertmanagerHosts: string[];
  readonly clusterIssuerName: string;
  readonly nodeAffinity?: NodeAffinity;
  readonly prometheusNodeAffinity?: NodeAffinity;
}

export class KubePrometheusStackChart extends BitwardenAuthTokenChart {
  constructor(
    scope: Construct,
    id: string,
    props: KubePrometheusStackChartProps,
  ) {
    const namespace = "monitoring";
    super(scope, id, { ...props, namespace });

    new Namespace(this, "namespace", {
      metadata: {
        name: namespace,
      },
    });

    const grafanaOauthSecretName = "grafana-oauth";
    new BitwardenOrgSecret(this, "grafana-oauth", {
      metadata: { name: grafanaOauthSecretName, namespace },
      spec: {
        secretName: grafanaOauthSecretName,
        map: [
          {
            bwSecretId: "1e5dfbd5-de25-493d-af39-b3e60077c30b",
            secretKeyName: "GF_AUTH_GENERIC_OAUTH_CLIENT_ID",
          },
          {
            bwSecretId: "a6cc4141-6d8d-4fc2-a510-b3e60077d988",
            secretKeyName: "GF_AUTH_GENERIC_OAUTH_CLIENT_SECRET",
          },
        ],
      },
    });

    // Prometheus Operator CRDs (ServiceMonitor, PodMonitor, PrometheusRule, etc.)
    const crds = [
      "alertmanagerconfigs",
      "alertmanagers",
      "podmonitors",
      "probes",
      "prometheusagents",
      "prometheuses",
      "prometheusrules",
      "scrapeconfigs",
      "servicemonitors",
      "thanosrulers",
    ];
    for (const crd of crds) {
      new Include(this, `crd-${crd}`, {
        url: `https://raw.githubusercontent.com/prometheus-operator/prometheus-operator/v0.79.2/example/prometheus-operator-crd/monitoring.coreos.com_${crd}.yaml`,
      });
    }

    new Kubeprometheusstack(this, "kube-prometheus-stack", {
      namespace: namespace,
      releaseName: "kube-prometheus-stack",
      helmFlags: ["--skip-crds"],
      values: {
        grafana: {
          adminPassword: "admin",
          initChownData: {
            enabled: false,
          },
          envFromSecrets: [{ name: grafanaOauthSecretName }],
          "grafana.ini": {
            server: {
              root_url: props.grafanaRootUrl,
            },
            auth: {
              signout_redirect_url: `${props.authentikUrl}/application/o/grafana/end-session/`,
              disable_login_form: true,
              oauth_auto_login: true,
            },
            "auth.generic_oauth": {
              name: "authentik",
              enabled: true,
              scopes: "openid profile email",
              auth_url: `${props.authentikUrl}/application/o/authorize/`,
              token_url: `${props.authentikUrl}/application/o/token/`,
              api_url: `${props.authentikUrl}/application/o/userinfo/`,
              role_attribute_path:
                "contains(groups, 'Grafana Admins') && 'Admin' || contains(groups, 'Grafana Editors') && 'Editor' || 'Viewer'",
            },
          },
          sidecar: {
            dashboards: {
              searchNamespace: "ALL",
              folderAnnotation: "grafana_folder",
              provider: {
                foldersFromFilesStructure: true,
              },
            },
            datasources: {
              initDatasources: true,
              skipReload: true,
              watchMethod: "LIST",
            },
          },
          persistence: {
            enabled: true,
            size: "1Gi",
          },
          additionalDataSources: [
            {
              name: "Loki",
              type: "loki",
              uid: "loki",
              url: "http://loki.monitoring.svc.cluster.local:3100",
              access: "proxy",
              isDefault: false,
            },
          ],
          affinity: props.nodeAffinity
            ? { nodeAffinity: props.nodeAffinity }
            : {},
        },
        prometheus: {
          prometheusSpec: {
            enableAdminAPI: true,
            serviceMonitorSelector: {},
            serviceMonitorSelectorNilUsesHelmValues: false,
            retention: "15d",
            retentionSize: "10GB",
            storageSpec: {
              volumeClaimTemplate: {
                spec: {
                  resources: {
                    requests: {
                      storage: "15Gi",
                    },
                  },
                },
              },
            },
            affinity: props.prometheusNodeAffinity
              ? { nodeAffinity: props.prometheusNodeAffinity }
              : {},
          },
        },
        alertmanager: {
          enabled: true,
          alertmanagerSpec: {
            affinity: props.nodeAffinity
              ? { nodeAffinity: props.nodeAffinity }
              : {},
          },
        },
        kubeStateMetrics: {
          affinity: props.nodeAffinity
            ? { nodeAffinity: props.nodeAffinity }
            : {},
        },
        prometheusOperator: {
          affinity: props.nodeAffinity
            ? { nodeAffinity: props.nodeAffinity }
            : {},
        },
      },
    });

    const grafanaCertSecretName = "grafana-tls";
    new Certificate(this, "grafana-cert", {
      metadata: {
        name: "grafana-tls",
        namespace,
      },
      spec: {
        secretName: grafanaCertSecretName,
        issuerRef: {
          name: props.clusterIssuerName,
          kind: "ClusterIssuer",
        },
        dnsNames: props.grafanaHosts,
      },
    });

    new IngressRoute(this, "grafana-ingress", {
      metadata: {
        name: "grafana",
        namespace,
        annotations: {
          "gethomepage.dev/enabled": "true",
          "gethomepage.dev/name": "Grafana",
          "gethomepage.dev/description": "Metrics Dashboards",
          "gethomepage.dev/group": "Monitoring",
          "gethomepage.dev/icon": "grafana.png",
          "gethomepage.dev/href": `https://${props.grafanaHosts[0]}`,
        },
      },
      spec: {
        entryPoints: ["websecure"],
        routes: [
          {
            match: props.grafanaHosts.map((h) => `Host(\`${h}\`)`).join(" || "),
            kind: IngressRouteSpecRoutesKind.RULE,
            middlewares: getPublicSecurityMiddlewares(props.grafanaHosts),
            services: [
              {
                name: "kube-prometheus-stack-grafana",
                port: IngressRouteSpecRoutesServicesPort.fromNumber(80),
                kind: IngressRouteSpecRoutesServicesKind.SERVICE,
              },
            ],
          },
        ],
        tls: {
          secretName: grafanaCertSecretName,
        },
      },
    });

    const prometheusCertSecretName = "prometheus-tls";
    new Certificate(this, "prometheus-cert", {
      metadata: {
        name: "prometheus-tls",
        namespace,
      },
      spec: {
        secretName: prometheusCertSecretName,
        issuerRef: {
          name: props.clusterIssuerName,
          kind: "ClusterIssuer",
        },
        dnsNames: props.prometheusHosts,
      },
    });

    new IngressRoute(this, "prometheus-ingress", {
      metadata: {
        name: "prometheus",
        namespace,
        annotations: {
          "gethomepage.dev/enabled": "true",
          "gethomepage.dev/name": "Prometheus",
          "gethomepage.dev/description": "Metrics Database",
          "gethomepage.dev/group": "Monitoring",
          "gethomepage.dev/icon": "prometheus.png",
          "gethomepage.dev/href": `https://${props.prometheusHosts[0]}`,
        },
      },
      spec: {
        entryPoints: ["websecure"],
        routes: [
          {
            match: props.prometheusHosts
              .map((h) => `Host(\`${h}\`)`)
              .join(" || "),
            kind: IngressRouteSpecRoutesKind.RULE,
            middlewares: getPublicSecurityMiddlewares(props.prometheusHosts),
            services: [
              {
                name: "kube-prometheus-stack-prometheus",
                port: IngressRouteSpecRoutesServicesPort.fromNumber(9090),
                kind: IngressRouteSpecRoutesServicesKind.SERVICE,
              },
            ],
          },
        ],
        tls: {
          secretName: prometheusCertSecretName,
        },
      },
    });

    const alertmanagerCertSecretName = "alertmanager-tls";
    new Certificate(this, "alertmanager-cert", {
      metadata: {
        name: "alertmanager-tls",
        namespace,
      },
      spec: {
        secretName: alertmanagerCertSecretName,
        issuerRef: {
          name: props.clusterIssuerName,
          kind: "ClusterIssuer",
        },
        dnsNames: props.alertmanagerHosts,
      },
    });

    new IngressRoute(this, "alertmanager-ingress", {
      metadata: {
        name: "alertmanager",
        namespace,
        annotations: {
          "gethomepage.dev/enabled": "true",
          "gethomepage.dev/name": "Alertmanager",
          "gethomepage.dev/description": "Alert Management",
          "gethomepage.dev/group": "Monitoring",
          "gethomepage.dev/icon": "alertmanager.png",
          "gethomepage.dev/href": `https://${props.alertmanagerHosts[0]}`,
        },
      },
      spec: {
        entryPoints: ["websecure"],
        routes: [
          {
            match: props.alertmanagerHosts
              .map((h) => `Host(\`${h}\`)`)
              .join(" || "),
            kind: IngressRouteSpecRoutesKind.RULE,
            middlewares: getPublicSecurityMiddlewares(props.alertmanagerHosts),
            services: [
              {
                name: "kube-prometheus-stack-alertmanager",
                port: IngressRouteSpecRoutesServicesPort.fromNumber(9093),
                kind: IngressRouteSpecRoutesServicesKind.SERVICE,
              },
            ],
          },
        ],
        tls: {
          secretName: alertmanagerCertSecretName,
        },
      },
    });
  }
}
