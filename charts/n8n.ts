import { App, Size } from "cdk8s";
import {
  Cpu,
  Deployment,
  DeploymentStrategy,
  Env,
  EnvValue,
  Namespace,
} from "cdk8s-plus-28";
import { Construct } from "constructs";
import {
  IngressRouteSpecRoutesKind,
  IngressRouteSpecRoutesServicesPort,
} from "../imports/traefik.io";
import {
  cloudSubdomain,
  getPublicSecurityMiddlewares,
  homeSubdomain,
} from "../lib/hosts";
import { AuthMiddleware, SecureIngressRoute } from "../lib/ingress";
import { LocalPathPvc } from "../lib/local-path";
import { BitwardenAuthTokenChart, BitwardenOrgSecret } from "./bitwarden";

interface N8nChartProps {
  readonly homeHost: string;
  readonly webhookHost: string;
}

export class N8nChart extends BitwardenAuthTokenChart {
  constructor(scope: Construct, id: string, props: N8nChartProps) {
    const namespace = "n8n";
    const { homeHost, webhookHost } = props;
    super(scope, id, { namespace, ...props });

    new Namespace(this, "namespace", { metadata: { name: namespace } });

    const dataVolume = new LocalPathPvc(this, "data-pvc").toVolume();
    const workVolume = new LocalPathPvc(this, "work-pvc").toVolume();

    const encryptionKey = new BitwardenOrgSecret(this, "encryption-key", {
      name: "n8n-encryption-key",
      map: [
        {
          bwSecretId: "198486ae-d1bf-4dff-8d28-b3eb00c4e62e",
          secretKeyName: "N8N_ENCRYPTION_KEY",
        },
      ],
    }).toSecret();

    const n8n = new Deployment(this, "deployment", {
      replicas: 1,
      strategy: DeploymentStrategy.recreate(),
      volumes: [dataVolume, workVolume],
      containers: [
        {
          image: "docker.n8n.io/n8nio/n8n:latest",
          ports: [{ number: 5678 }],
          envVariables: {
            N8N_HOST: EnvValue.fromValue(homeHost),
            N8N_EDITOR_BASE_URL: EnvValue.fromValue(`https://${homeHost}`),
            N8N_PROTOCOL: EnvValue.fromValue("https"),
            N8N_TRUST_PROXY: EnvValue.fromValue("true"),
            N8N_PROXY_HOPS: EnvValue.fromValue("1"),
            N8N_LOG_LEVEL: EnvValue.fromValue("info"),
            N8N_RESTRICT_FILE_ACCESS_TO: EnvValue.fromValue("/data/work"),
            WEBHOOK_URL: EnvValue.fromValue(`https://${webhookHost}/`),
            DB_TYPE: EnvValue.fromValue("sqlite"),
            NODES_EXCLUDE: EnvValue.fromValue("[]"),
          },
          envFrom: [Env.fromSecret(encryptionKey)],
          volumeMounts: [
            { path: "/home/node/.n8n", volume: dataVolume },
            { path: "/data/work", volume: workVolume },
          ],
          securityContext: {
            ensureNonRoot: false,
            readOnlyRootFilesystem: false,
          },
          resources: {
            memory: { request: Size.mebibytes(256), limit: Size.gibibytes(1) },
            cpu: { request: Cpu.millis(100), limit: Cpu.millis(500) },
          },
        },
      ],
    }).exposeViaService();

    const authMiddleware = new AuthMiddleware(this, "auth-middleware", {
      name: "n8n-auth",
    });

    SecureIngressRoute.fromService(this, "home-ingress", n8n, {
      name: "n8n-home",
      hosts: [homeHost],
      middlewares: [
        ...getPublicSecurityMiddlewares([homeHost]),
        {
          name: authMiddleware.name,
          namespace,
        },
      ],
    });

    new SecureIngressRoute(this, "webhook-ingress", {
      name: "n8n-webhooks",
      hosts: [webhookHost],
      routes: [
        {
          match: `Host(\`${webhookHost}\`) && (PathPrefix(\`/webhook\`) || PathPrefix(\`/webhook-test\`))`,
          kind: IngressRouteSpecRoutesKind.RULE,
          middlewares: getPublicSecurityMiddlewares([webhookHost]),
          services: [
            {
              name: n8n.name,
              port: IngressRouteSpecRoutesServicesPort.fromNumber(n8n.port),
            },
          ],
        },
      ],
    });
  }
}

if (require.main === module) {
  const app = new App();
  new N8nChart(app, "n8n", {
    homeHost: homeSubdomain("n8n"),
    webhookHost: cloudSubdomain("n8n"),
  });

  app.synth();
}
