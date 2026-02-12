import { Construct } from "constructs";
import { App, Chart, ChartProps, Size } from "cdk8s";
import {
  Namespace,
  Deployment,
  Cpu,
  DeploymentStrategy,
  EnvValue,
} from "cdk8s-plus-28";
import { allSubdomains } from "../lib/hosts";
import { SecureIngressRoute } from "../lib/ingress";
import { LocalPathPvc } from "../lib/local-path";

interface NtfyChartProps extends ChartProps {
  readonly hosts: string[];
}

export class NtfyChart extends Chart {
  readonly internalUrl: string;

  constructor(scope: Construct, id: string, props: NtfyChartProps) {
    super(scope, id, { ...props });

    const namespace = "ntfy";

    new Namespace(this, "namespace", {
      metadata: { name: namespace },
    });

    const authVolume = new LocalPathPvc(this, "auth-pvc", {
      namespace,
      name: "ntfy-auth",
      storage: Size.gibibytes(1),
    }).toVolume();

    const podLabels = { "app.kubernetes.io/name": "ntfy" };
    const deployment = new Deployment(this, "ntfy", {
      metadata: { name: "ntfy", namespace, labels: podLabels },
      podMetadata: { labels: podLabels },
      replicas: 1,
      strategy: DeploymentStrategy.recreate(),
      volumes: [authVolume],
      containers: [
        {
          name: "ntfy",
          image: "binwiederhier/ntfy:latest",
          args: ["serve"],
          envVariables: {
            NTFY_AUTH_FILE: EnvValue.fromValue("/var/lib/ntfy/auth.db"),
            NTFY_AUTH_DEFAULT_ACCESS: EnvValue.fromValue("deny-all"),
          },
          portNumber: 80,
          volumeMounts: [{ path: "/var/lib/ntfy", volume: authVolume }],
          resources: {
            cpu: { request: Cpu.millis(50), limit: Cpu.millis(200) },
            memory: { request: Size.mebibytes(64), limit: Size.mebibytes(128) },
          },
          securityContext: {
            ensureNonRoot: false,
          },
        },
      ],
    });

    const service = deployment.exposeViaService();

    this.internalUrl = `http://${service.name}.${namespace}.svc.cluster.local`;

    SecureIngressRoute.fromService(this, "ingress", service, {
      namespace,
      hosts: props.hosts,
    });
  }
}

if (require.main === module) {
  const app = new App();
  new NtfyChart(app, "ntfy", {
    hosts: allSubdomains("ntfy"),
  });
  app.synth();
}
