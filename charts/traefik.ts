import * as fs from "fs";
import * as path from "path";
import { Construct } from "constructs";
import { App, Include } from "cdk8s";
import { ConfigMap, Namespace } from "cdk8s-plus-28";
import { ServiceMonitor } from "../imports/monitoring.coreos.com";
import { Traefik, TraefikValues } from "../imports/traefik";
import { BitwardenAuthTokenChart, BitwardenOrgSecret } from "./bitwarden";
import { createSecurityMiddlewares } from "../lib/security";

export class TraefikChart extends BitwardenAuthTokenChart {
  constructor(scope: Construct, id: string) {
    const namespace = "traefik";
    super(scope, id, { namespace });

    new Namespace(this, "namespace", {
      metadata: {
        name: namespace,
      },
    });

    // Traefik CRDs (IngressRoute, Middleware, etc.)
    new Include(this, "crds", {
      url: "https://raw.githubusercontent.com/traefik/traefik/v3.3/docs/content/reference/dynamic-configuration/kubernetes-crd-definition-v1.yml",
    });

    // Security middlewares (headers, rate limiting)
    createSecurityMiddlewares(this);

    const bouncerKeySecret = new BitwardenOrgSecret(
      this,
      "bouncer-key-secret",
      {
        namespace,
        name: "crowdsec-bouncer-key",
        map: [
          {
            bwSecretId: "e462ab7b-f219-4fd9-b8c0-b3df00ea0e48",
            secretKeyName: "api-key",
          },
        ],
      },
    );

    const values: TraefikValues = {
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
      deployment: {
        annotations: {
          "keel.sh/policy": "minor",
          "keel.sh/trigger": "poll",
        },
      },
      providers: {
        kubernetesCrd: {
          allowCrossNamespace: true,
        },
      },
      ports: {
        metrics: {
          expose: { default: true },
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
          transport: {
            respondingTimeouts: {
              readTimeout: "30s",
              writeTimeout: "30s",
              idleTimeout: "180s",
            },
            lifeCycle: {
              requestAcceptGraceTimeout: "5s",
              graceTimeOut: "10s",
            },
          },
        },
        ssh: {
          port: 2222,
          expose: { default: true },
          exposedPort: 2222,
          protocol: "TCP",
        },
      },
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
          name: bouncerKeySecret.name,
          mountPath: "/etc/traefik/crowdsec-bouncer-key",
          type: "secret",
        },
      ],
    };

    new Traefik(this, "traefik", {
      namespace,
      releaseName: "traefik",
      helmFlags: ["--skip-crds"],
      values,
    });

    new ServiceMonitor(this, "service-monitor", {
      metadata: { name: "traefik", namespace },
      spec: {
        selector: {
          matchLabels: {
            "app.kubernetes.io/instance": "traefik-traefik",
            "app.kubernetes.io/name": "traefik",
          },
        },
        endpoints: [
          {
            port: "metrics",
            interval: "30s",
          },
        ],
      },
    });

    const dashboardPath = path.join(__dirname, "../dashboards/traefik.json");
    if (fs.existsSync(dashboardPath)) {
      const dashboardJson = fs
        .readFileSync(dashboardPath, "utf-8")
        .replace(/\$\{DS_PROMETHEUS\}/g, "prometheus");

      new ConfigMap(this, "dashboard", {
        metadata: {
          name: "traefik-dashboard",
          namespace,
          labels: { grafana_dashboard: "1" },
          annotations: { grafana_folder: "Traefik" },
        },
        data: {
          "traefik.json": dashboardJson,
        },
      });
    }
  }
}
if (require.main === module) {
  const app = new App();

  new TraefikChart(app, "traefik");

  app.synth();
}
