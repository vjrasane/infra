import { Construct } from "constructs";
import { App, ChartProps, Size } from "cdk8s";
import {
  Cpu,
  Namespace,
  Deployment,
  DeploymentStrategy,
  EnvValue,
} from "cdk8s-plus-28";
import { BitwardenAuthTokenChart, BitwardenOrgSecret } from "./bitwarden";
import { cloudProviderNode } from "../lib/affinity";

export class ChessBotChart extends BitwardenAuthTokenChart {
  constructor(scope: Construct, id: string, props: ChartProps = {}) {
    const namespace = "chess-bot";
    super(scope, id, { ...props, namespace });

    new Namespace(this, "namespace", {
      metadata: { name: namespace },
    });

    const telegramSecret = new BitwardenOrgSecret(this, "telegram-secret", {
      name: "telegram-bot-token",
      namespace,
      map: [
        {
          bwSecretId: "8ae6c8b2-fc27-4aa6-bbcc-b41d01226725",
          secretKeyName: "token", // pragma: allowlist secret
        },
      ],
    });

    const podLabels = { "app.kubernetes.io/name": "chess-bot" };
    const deployment = new Deployment(this, "chess-bot", {
      metadata: { name: "chess-bot", namespace, labels: podLabels },
      podMetadata: { labels: podLabels },
      replicas: 1,
      strategy: DeploymentStrategy.recreate(),
      containers: [
        {
          name: "chess-bot",
          image: "ghcr.io/vjrasane/telegram-chess-bot:latest",
          envVariables: {
            TELEGRAM_BOT_TOKEN: EnvValue.fromSecretValue({
              secret: { name: telegramSecret.name } as any,
              key: "token",
            }),
          },
          resources: {
            cpu: { request: Cpu.millis(100), limit: Cpu.millis(500) },
            memory: { request: Size.mebibytes(64), limit: Size.mebibytes(256) },
          },
          securityContext: {
            ensureNonRoot: false,
            readOnlyRootFilesystem: false,
          },
        },
      ],
    });

    deployment.scheduling.attract(cloudProviderNode("aws"));
  }
}

if (require.main === module) {
  const app = new App();
  new ChessBotChart(app, "chess-bot");
  app.synth();
}
