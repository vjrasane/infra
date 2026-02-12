import { App, Cron, Size } from "cdk8s";
import {
  Cpu,
  Deployment,
  DeploymentStrategy,
  Env,
  EnvValue,
  Namespace,
  Volume,
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
import {
  FILEBASE_RESTIC_REPO,
  ResticBackup,
  ResticCredentials,
  ResticRepo,
  createSqliteVacuum,
} from "../lib/restic";
import { BitwardenAuthTokenChart, BitwardenOrgSecret } from "./bitwarden";

interface N8nChartProps {
  readonly editorHosts: string[];
  readonly webhookHost: string;
  readonly resticRepo: ResticRepo;
}

export class N8nChart extends BitwardenAuthTokenChart {
  constructor(scope: Construct, id: string, props: N8nChartProps) {
    const namespace = "n8n";
    const { editorHosts, webhookHost } = props;
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

    const listonicCredentials = new BitwardenOrgSecret(
      this,
      "listonic-credentials",
      {
        name: "n8n-listonic-credentials",
        map: [
          {
            bwSecretId: "9a72fd3e-0f05-4ed7-b8ec-b3ef00789198",
            secretKeyName: "LISTONIC_EMAIL",
          },
          {
            bwSecretId: "4d8d13d2-e697-46c8-93a0-b3ef0078b867",
            secretKeyName: "LISTONIC_PASSWORD",
          },
        ],
      },
    ).toSecret();

    const n8n = new Deployment(this, "deployment", {
      replicas: 1,
      strategy: DeploymentStrategy.recreate(),
      volumes: [dataVolume, workVolume],
      containers: [
        {
          image: "docker.n8n.io/n8nio/n8n:latest",
          ports: [{ number: 5678 }],
          envVariables: {
            TZ: EnvValue.fromValue("Europe/Helsinki"),
            GENERIC_TIMEZONE: EnvValue.fromValue("Europe/Helsinki"),
            N8N_HOST: EnvValue.fromValue(editorHosts[0]),
            N8N_EDITOR_BASE_URL: EnvValue.fromValue(
              `https://${editorHosts[0]}`,
            ),
            N8N_PROTOCOL: EnvValue.fromValue("https"),
            N8N_TRUST_PROXY: EnvValue.fromValue("true"),
            N8N_PROXY_HOPS: EnvValue.fromValue("1"),
            N8N_BLOCK_ENV_ACCESS_IN_NODE: EnvValue.fromValue("false"),
            N8N_LOG_LEVEL: EnvValue.fromValue("info"),
            N8N_RESTRICT_FILE_ACCESS_TO: EnvValue.fromValue("/data/work"),
            NODE_FUNCTION_ALLOW_BUILTIN: EnvValue.fromValue("*"),
            WEBHOOK_URL: EnvValue.fromValue(`https://${webhookHost}/`),
            DB_TYPE: EnvValue.fromValue("sqlite"),
            NODES_EXCLUDE: EnvValue.fromValue("[]"),
          },
          envFrom: [
            Env.fromSecret(encryptionKey),
            Env.fromSecret(listonicCredentials),
          ],
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

    SecureIngressRoute.fromService(this, "editor-ingress", n8n, {
      name: "n8n-editor",
      hosts: editorHosts,
      middlewares: [
        ...getPublicSecurityMiddlewares(editorHosts),
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
          match: `Host(\`${webhookHost}\`) && (PathPrefix(\`/webhook\`) ||
  PathPrefix(\`/webhook-test\`) || PathPrefix(\`/api\`))`,
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

    const credentials = new ResticCredentials(this, "restic-repo", {
      name: "n8n-restic-credentials",
      repo: props.resticRepo,
    });

    const backupVolume = Volume.fromEmptyDir(
      this,
      "backup-volume",
      "backup-data",
    );
    new ResticBackup(this, "backup", {
      schedule: Cron.schedule({ minute: "0", hour: "1" }),
      hostName: "n8n",
      volume: backupVolume,
      credentials,
      initContainers: [
        createSqliteVacuum(
          "/home/node/.n8n/database.sqlite",
          "/backup/database.sqlite",
          { path: "/home/node/.n8n", volume: dataVolume, readOnly: true },
          { path: "/backup", volume: backupVolume },
        ),
        // {
        //   image: "docker.n8n.io/n8nio/n8n:latest",
        //   command: ["/bin/sh", "-c"],
        //   args: [
        //     "mkdir -p /backup/workflows /backup/credentials && n8n export:workflow --all --output=/backup/workflows/ && n8n export:credentials --all --output=/backup/credentials/",
        //   ],
        //   envVariables: {
        //     DB_TYPE: EnvValue.fromValue("sqlite"),
        //   },
        //   envFrom: [Env.fromSecret(encryptionKey)],
        //   volumeMounts: [
        //     { path: "/home/node/.n8n", volume: dataVolume, readOnly: true },
        //     { path: "/backup", volume: backupVolume },
        //   ],
        //   securityContext: {
        //     ensureNonRoot: false,
        //     readOnlyRootFilesystem: false,
        //   },
        // },
      ],
      prune: true,
    });
  }
}

if (require.main === module) {
  const app = new App();
  new N8nChart(app, "n8n", {
    editorHosts: [cloudSubdomain("n8n"), homeSubdomain("n8n")],
    webhookHost: cloudSubdomain("n8n"),
    resticRepo: FILEBASE_RESTIC_REPO,
  });

  app.synth();
}
