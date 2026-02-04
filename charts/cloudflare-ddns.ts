import { Construct } from "constructs";
import { ChartProps, Cron } from "cdk8s";
import { Namespace, CronJob, EnvValue, Node } from "cdk8s-plus-28";
import { BitwardenAuthTokenChart, BitwardenOrgSecret } from "./bitwarden";

interface CloudflareDdnsChartProps extends ChartProps {
  readonly schedule?: string;
  readonly nodeName?: string;
}

export class CloudflareDdnsChart extends BitwardenAuthTokenChart {
  constructor(
    scope: Construct,
    id: string,
    props: CloudflareDdnsChartProps = {},
  ) {
    const namespace = "cloudflare";
    super(scope, id, { ...props, namespace });

    new Namespace(this, "namespace", {
      metadata: { name: namespace },
    });

    const cloudflareSecret = new BitwardenOrgSecret(this, "cloudflare-secret", {
      name: "cloudflare",
      namespace,
      map: [
        {
          bwSecretId: "08393544-bffb-420d-9aa5-b2dc01315f21",
          secretKeyName: "api-token", // pragma: allowlist secret
        },
        {
          bwSecretId: "9cbb5a9b-0a89-4ab9-9cac-b2dc013170da",
          secretKeyName: "domain",
        },
      ],
    });

    const cronJob = new CronJob(this, "cloudflare-ddns", {
      metadata: { name: "cloudflare-ddns", namespace },
      schedule: Cron.schedule({ minute: "*/5" }),
      successfulJobsRetained: 1,
      failedJobsRetained: 1,
      containers: [
        {
          name: "cloudflare-ddns",
          image: "favonia/cloudflare-ddns:latest",
          envVariables: {
            CLOUDFLARE_API_TOKEN: EnvValue.fromSecretValue({
              secret: { name: cloudflareSecret.name } as any,
              key: "api-token",
            }),
            DOMAINS: EnvValue.fromSecretValue({
              secret: { name: cloudflareSecret.name } as any,
              key: "domain",
            }),
            PROXIED: EnvValue.fromValue("false"),
            UPDATE_CRON: EnvValue.fromValue("@once"),
            UPDATE_ON_START: EnvValue.fromValue("true"),
            IP6_PROVIDER: EnvValue.fromValue("none"),
          },
          securityContext: {
            ensureNonRoot: false,
            readOnlyRootFilesystem: false,
          },
        },
      ],
    });

    if (props.nodeName) {
      cronJob.scheduling.assign(Node.named(props.nodeName));
    }
  }
}
