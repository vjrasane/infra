import { App, ChartProps, Cron, Size } from "cdk8s";
import {
  Cpu,
  CronJob,
  Deployment,
  DeploymentStrategy,
  Env,
  EnvValue,
  Namespace,
  Volume,
} from "cdk8s-plus-28";
import { Construct } from "constructs";
import {
  authentikUrl,
  getHomeHost,
  getHomepageAnnotations,
  homeSubdomain,
} from "../lib/hosts";
import { SecureIngressRoute } from "../lib/ingress";
import { LocalPathPvc } from "../lib/local-path";
import { ResticCredentials, ResticRepo, TEBI_RESTIC_REPO } from "../lib/restic";
import { BitwardenAuthTokenChart, BitwardenOrgSecret } from "./bitwarden";

interface PaperlessChartProps extends ChartProps {
  authentikUrl: string;
  hosts: string[];
  resticRepo: ResticRepo;
}

export class PaperlessChart extends BitwardenAuthTokenChart {
  constructor(scope: Construct, id: string, props: PaperlessChartProps) {
    const namespace = "paperless";
    super(scope, id, { ...props, namespace });

    new Namespace(this, "namespace", {
      metadata: { name: namespace },
    });

    const redis = new Deployment(this, "redis", {
      replicas: 1,
      containers: [
        {
          image: "docker.io/library/redis:7",
          ports: [{ number: 6379 }],
          securityContext: {
            ensureNonRoot: false,
            readOnlyRootFilesystem: false,
          },
          resources: {
            memory: { request: Size.mebibytes(64), limit: Size.mebibytes(128) },
            cpu: { request: Cpu.millis(50), limit: Cpu.millis(100) },
          },
        },
      ],
    }).exposeViaService();

    const oidcConfigSecret = new BitwardenOrgSecret(this, "oidc-config", {
      name: "oidc-config",
      map: [
        {
          bwSecretId: "3ccace3a-30e5-436a-a24f-b3e900dfa305",
          secretKeyName: "config",
        },
      ],
    }).toSecret();

    const dataVolume = new LocalPathPvc(this, "data-pvc", {
      name: "paperless-data",
    }).toVolume();

    const mediaVolume = new LocalPathPvc(this, "media-pvc", {
      name: "paperless-media",
    }).toVolume();

    const paperlessVolumeMounts = [
      { path: "/usr/src/paperless/data", volume: dataVolume },
      { path: "/usr/src/paperless/media", volume: mediaVolume },
    ];

    const paperless = new Deployment(this, "paperless", {
      replicas: 1,
      strategy: DeploymentStrategy.recreate(),
      containers: [
        {
          image: "ghcr.io/paperless-ngx/paperless-ngx:latest",
          ports: [{ number: 8000 }],
          envVariables: {
            PAPERLESS_URL: EnvValue.fromValue(`https://${props.hosts[0]}`),
            PAPERLESS_REDIS: EnvValue.fromValue(`redis://${redis.name}:6379`),
            PAPERLESS_OCR_USER_ARGS: EnvValue.fromValue(
              JSON.stringify({
                invalidate_digital_signatures: true,
              }),
            ),
            PAPERLESS_APPS: EnvValue.fromValue(
              "allauth.socialaccount.providers.openid_connect",
            ),
            PAPERLESS_LOGOUT_REDIRECT_URL: EnvValue.fromValue(
              `${props.authentikUrl}/application/o/paperless/end-session/`,
            ),
            PAPERLESS_DISABLE_REGULAR_LOGIN: EnvValue.fromValue("true"),
            PAPERLESS_REDIRECT_LOGIN_TO_SSO: EnvValue.fromValue("true"),
            PAPERLESS_SOCIALACCOUNT_ALLOW_SIGNUPS: EnvValue.fromValue("true"),
            PAPERLESS_SOCIAL_AUTO_SIGNUP: EnvValue.fromValue("true"),
            PAPERLESS_SOCIALACCOUNT_PROVIDERS: EnvValue.fromSecretValue({
              secret: oidcConfigSecret,
              key: "config",
            }),
            PAPERLESS_SOCIAL_ACCOUNT_DEFAULT_GROUPS:
              EnvValue.fromValue("default"),
          },
          volumeMounts: paperlessVolumeMounts,
          securityContext: {
            ensureNonRoot: false,
            readOnlyRootFilesystem: false,
          },
          resources: {
            memory: { request: Size.mebibytes(256), limit: Size.gibibytes(1) },
            cpu: { request: Cpu.millis(250), limit: Cpu.millis(1000) },
          },
        },
      ],

      volumes: [dataVolume, mediaVolume],
    }).exposeViaService();

    SecureIngressRoute.fromService(this, "ingress", paperless, {
      hosts: props.hosts,
      metadata: {
        annotations: getHomepageAnnotations("paperless", {
          host: getHomeHost(props.hosts),
        }),
      },
    });

    const credentials = new ResticCredentials(this, "restic-credentials", {
      name: "paperless-restic-credentials",
      repo: props.resticRepo,
    }).toSecret();

    const backupVolume = Volume.fromEmptyDir(
      this,
      "backup-volume",
      "backup-data",
    );
    new CronJob(this, "backup-job", {
      schedule: Cron.schedule({ minute: "0", hour: "3" }),
      successfulJobsRetained: 1,
      failedJobsRetained: 1,
      volumes: [backupVolume],
      initContainers: [
        {
          image: "ghcr.io/paperless-ngx/paperless-ngx:latest",
          command: [
            "python3",
            "/usr/src/paperless/src/manage.py",
            "document_exporter",
            "--passphrase",
            "$PASSPHRASE",
            "/export",
          ],
          // args: [
          //   `
          //   set -e
          //   echo "Starting document_export..."
          //   document_exporter --passphrase $PASSPHRASE /export
          //   echo "Export completed:"
          //   ls -la /export/
          //   `,
          // ],
          envVariables: {
            PASSPHRASE: EnvValue.fromSecretValue({
              secret: credentials,
              key: ResticCredentials.resticPasswordSecretKeyName,
            }),
          },
          volumeMounts: [
            { path: "/export", volume: backupVolume },
            ...paperlessVolumeMounts,
          ],
          securityContext: {
            ensureNonRoot: false,
            readOnlyRootFilesystem: false,
          },

          resources: {
            memory: {
              request: Size.mebibytes(128),
              limit: Size.mebibytes(512),
            },
            cpu: { request: Cpu.millis(100), limit: Cpu.millis(500) },
          },
        },
      ],
      containers: [
        {
          name: "restic-backup",
          image: "restic/restic:latest",
          command: ["/bin/sh", "-c"],
          args: [
            `
            set -e
            echo "Initializing restic repo (if needed)..."
            restic snapshots || restic init
            echo "Starting restic backup..."
            restic backup --host ${namespace} /backups
            echo "Backup complete. Pruning old snapshots..."
            restic forget --host ${namespace} --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune
            echo "Done. Current snapshots:"
            restic snapshots`,
          ],
          envVariables: {
            RESTIC_REPOSITORY: EnvValue.fromValue(props.resticRepo.url),
          },
          envFrom: [Env.fromSecret(credentials)],
          volumeMounts: [{ path: "/backups", volume: backupVolume }],
          securityContext: {
            ensureNonRoot: false,
            readOnlyRootFilesystem: false,
          },
          resources: {
            memory: {
              request: Size.mebibytes(64),
              limit: Size.mebibytes(256),
            },
            cpu: { request: Cpu.millis(50), limit: Cpu.millis(250) },
          },
        },
      ],
    });
  }
}

if (require.main === module) {
  const app = new App();
  new PaperlessChart(app, "paperless", {
    authentikUrl,
    hosts: [homeSubdomain("paperless")],
    resticRepo: TEBI_RESTIC_REPO,
  });

  app.synth();
}
