import { App, ChartProps, Helm } from "cdk8s";
import { Namespace } from "cdk8s-plus-28";
import { Construct } from "constructs";
import { IngressRouteTcpSpecRoutesServicesPort } from "../imports/traefik.io";
import {
  CLOUD_PROVIDER_LABEL,
  labelExists,
  requiredNodeAffinity,
} from "../lib/affinity";
import { allSubdomains } from "../lib/hosts";
import { SecureIngressRoute } from "../lib/ingress";
import { BitwardenAuthTokenChart, BitwardenOrgSecret } from "./bitwarden";

interface WindmillChartProps extends ChartProps {
  hosts: string[];
}
export class WindmillChart extends BitwardenAuthTokenChart {
  constructor(scope: Construct, id: string, props: WindmillChartProps) {
    const namespace = "windmill";
    super(scope, id, { ...props, namespace });

    new Namespace(this, "namespace", {
      metadata: {
        name: namespace,
      },
    });
    const affinity = {
      nodeAffinity: requiredNodeAffinity(labelExists(CLOUD_PROVIDER_LABEL)),
    };

    const oauthSecret = new BitwardenOrgSecret(this, "oauth-config", {
      name: "windmill-oauth",
      map: [
        {
          bwSecretId: "505d0f2b-eddc-415f-9d57-b3f2013e3304",
          secretKeyName: "oauth.json",
        },
      ],
    });

    new Helm(this, "windmill", {
      repo: "https://windmill-labs.github.io/windmill-helm-charts/",
      chart: "windmill",
      values: {
        ingress: { enabled: false },
        windmill: {
          baseDomain: props.hosts[0],
          baseProtocol: "https",
          appReplicas: 1,
          app: {
            affinity,
            extraEnv: [
              { name: "SIGNUP_WITH_LOGIN", value: "true" },
            ],
            volumes: [
              {
                name: "oauth-config",
                secret: { secretName: oauthSecret.secretName },
              },
            ],
            volumeMounts: [
              {
                name: "oauth-config",
                mountPath: "/usr/src/app/oauth.json",
                subPath: "oauth.json",
                readOnly: true,
              },
            ],
            resources: {
              requests: {
                cpu: "100m",
                memory: "256Mi",
              },
              limits: {
                cpu: "500m",
                memory: "512Mi",
              },
            },
          },
          multiplayerReplicas: 0,
          workerGroups: [
            {
              name: "default",
              replicas: 1,
              affinity,
              resources: {
                requests: {
                  cpu: "250m",
                  memory: "512Mi",
                },
                limits: {
                  cpu: "1",
                  memory: "2Gi",
                },
              },
            },
            {
              name: "native",
              replicas: 1,
              affinity,
              resources: {
                requests: {
                  cpu: "250m",
                  memory: "512Mi",
                },
                limits: {
                  cpu: "1",
                  memory: "2Gi",
                },
              },
            },
          ],
          extraReplicas: 1,
          windmillExtra: {
            enableLsp: true,
            affinity,
            extraEnv: [
              { name: "WINDMILL_BASE_URL", value: "http://windmill-app:8000" },
            ],
            resources: {
              requests: {
                cpu: "50m",
                memory: "128Mi",
              },
              limits: {
                cpu: "250m",
                memory: "256Mi",
              },
            },
          },
        },
      },
    });

    new SecureIngressRoute(this, "ingress", {
      hosts: props.hosts,
      routes: [
        SecureIngressRoute.createRoute(props.hosts, [
          {
            name: "windmill-app",
            port: IngressRouteTcpSpecRoutesServicesPort.fromNumber(8000),
          },
        ]),
        SecureIngressRoute.createRoute(
          props.hosts,
          [
            {
              name: "windmill-extra",
              port: IngressRouteTcpSpecRoutesServicesPort.fromNumber(3001),
            },
          ],
          { pathPrefix: "/ws" },
        ),
      ],
    });
  }
}

if (require.main === module) {
  const app = new App();
  new WindmillChart(app, "windmill", {
    hosts: allSubdomains("windmill"),
  });
  app.synth();
}
