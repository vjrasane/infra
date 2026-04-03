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

export class WordleBotChart extends BitwardenAuthTokenChart {
  constructor(scope: Construct, id: string, props: ChartProps = {}) {
    const namespace = "wordle-bot";
    super(scope, id, { ...props, namespace });

    new Namespace(this, "namespace", {
      metadata: { name: namespace },
    });

    const telegramSecret = new BitwardenOrgSecret(this, "telegram-secret", {
      name: "telegram-bot-token",
      namespace,
      map: [
        {
          bwSecretId: "a8ab2689-2c7a-416d-b787-b42100f3fdb5",
          secretKeyName: "token", // pragma: allowlist secret
        },
      ],
    });

    const podLabels = { "app.kubernetes.io/name": "wordle-bot" };
    const deployment = new Deployment(this, "wordle-bot", {
      metadata: { name: "wordle-bot", namespace, labels: podLabels },
      podMetadata: { labels: podLabels },
      replicas: 1,
      strategy: DeploymentStrategy.recreate(),
      containers: [
        {
          name: "wordle-bot",
          image: "ghcr.io/vjrasane/telegram-wordle-bot:latest",
          envVariables: {
            TELEGRAM_BOT_TOKEN: EnvValue.fromSecretValue({
              secret: { name: telegramSecret.name } as any,
              key: "token",
            }),
            NODE_ENV: EnvValue.fromValue("production"),
            TELEGRAM_ALLOW_PRIVATE: EnvValue.fromValue("false"),
            LOG_LEVEL: EnvValue.fromValue("debug"),
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
  new WordleBotChart(app, "wordle-bot");
  app.synth();
}
