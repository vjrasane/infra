import { App, ChartProps, Helm } from "cdk8s";
import { Namespace } from "cdk8s-plus-28";
import { Construct } from "constructs";
import {
  IngressRouteSpecRoutesServicesKind,
  IngressRouteSpecRoutesServicesPort,
} from "../imports/traefik.io";
import { homeSubdomain } from "../lib/hosts";
import { SecureIngressRoute } from "../lib/ingress";
import { BitwardenAuthTokenChart, BitwardenOrgSecret } from "./bitwarden";

interface KeelChartProps extends ChartProps {
  readonly hosts: string[];
}

export class KeelChart extends BitwardenAuthTokenChart {
  constructor(scope: Construct, id: string, props: KeelChartProps) {
    const namespace = "keel";
    super(scope, id, { ...props, namespace });

    new Namespace(this, "namespace", {
      metadata: { name: namespace },
    });

    const ntfyWebhook = new BitwardenOrgSecret(this, "ntfy", {
      name: "ntfy-webhook",
      map: [
        {
          bwSecretId: "dd4c7044-3225-4d55-bc1b-b3f1012c9755",
          secretKeyName: "WEBHOOK_ENDPOINT",
        },
      ],
    }).toSecret();

    new Helm(this, "keel", {
      chart: "keel",
      repo: "https://charts.keel.sh",
      namespace,
      releaseName: "keel",
      values: {
        helmProvider: { enabled: false },
        polling: { enabled: true, defaultSchedule: "@every 5m" },
        basicauth: { enabled: false },
        webhook: { enabled: false },
        secret: {
          create: false,
          name: ntfyWebhook.name,
        },
      },
    });

    new SecureIngressRoute(this, "ingress", {
      namespace,
      hosts: props.hosts,
      routes: [
        SecureIngressRoute.createRoute(props.hosts, [
          {
            name: "keel",
            port: IngressRouteSpecRoutesServicesPort.fromNumber(9300),
            kind: IngressRouteSpecRoutesServicesKind.SERVICE,
          },
        ]),
      ],
    });
  }
}
if (require.main === module) {
  const app = new App();
  new KeelChart(app, "keel", {
    hosts: [homeSubdomain("keel")],
  });
  app.synth();
}
