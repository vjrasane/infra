import { App, ChartProps, Duration, Size } from "cdk8s";
import {
  Cpu,
  Deployment,
  DeploymentStrategy,
  EnvValue,
  Handler,
  Namespace,
  Probe,
  Volume,
} from "cdk8s-plus-28";
import { Construct } from "constructs";
import { IngressRouteTcpSpecRoutesServicesPort } from "../imports/traefik.io";
import { cloudNode } from "../lib/affinity";
import { allSubdomains } from "../lib/hosts";
import { SecureIngressRoute } from "../lib/ingress";
import { Postgres, PostgresCredentials } from "../lib/postgres";
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

    const oauthSecret = new BitwardenOrgSecret(this, "oauth-config", {
      name: "windmill-oauth",
      map: [
        {
          bwSecretId: "505d0f2b-eddc-415f-9d57-b3f2013e3304",
          secretKeyName: "oauth.json",
        },
      ],
    });

    const dbCredentials = new PostgresCredentials(this, "db-credentials", {
      database: "windmill",
      passwordSecretId: "e7e7f942-2cb2-43ab-b7fc-b3f3007f88b1",
    });

    const connectionString = new BitwardenOrgSecret(
      this,
      "db-connection-string",
      {
        name: "windmill-db-connection-string",
        map: [
          {
            bwSecretId: "44cb3c07-3d09-4c9b-837a-b3f300807ab4",
            secretKeyName: "url",
          },
        ],
      },
    ).toSecret();

    new Postgres(this, "postgres", {
      name: "windmill-postgres",
      credentials: dbCredentials,
    });

    const keelAnnotations = {
      "keel.sh/policy": "minor",
      "keel.sh/trigger": "poll",
    };

    const databaseUrl = EnvValue.fromSecretValue({
      secret: connectionString,
      key: "url",
    });

    const oauthVolume = Volume.fromSecret(
      this,
      "oauth-volume",
      oauthSecret.toSecret(),
    );

    // App (server)
    const app = new Deployment(this, "app", {
      metadata: { annotations: keelAnnotations },
      replicas: 1,
      strategy: DeploymentStrategy.recreate(),
      terminationGracePeriod: Duration.seconds(40),
      volumes: [oauthVolume],
      containers: [
        {
          image: "ghcr.io/windmill-labs/windmill:latest",
          ports: [
            { number: 8000, name: "http" },
            { number: 8001, name: "metrics" },
          ],
          envVariables: {
            DATABASE_URL: databaseUrl,
            BASE_URL: EnvValue.fromValue(`https://${props.hosts[0]}`),
            MODE: EnvValue.fromValue("server"),
            SIGNUP_WITH_LOGIN: EnvValue.fromValue("true"),
            RUST_LOG: EnvValue.fromValue("info"),
            JSON_FMT: EnvValue.fromValue("true"),
          },
          volumeMounts: [
            {
              path: "/usr/src/app/oauth.json",
              volume: oauthVolume,
              subPath: "oauth.json",
              readOnly: true,
            },
          ],
          readiness: Probe.fromHttpGet("/", {
            port: 8000,
            initialDelaySeconds: Duration.seconds(5),
            periodSeconds: Duration.seconds(5),
            failureThreshold: 1,
          }),
          lifecycle: {
            preStop: Handler.fromCommand(["sleep", "30"]),
          },
          securityContext: {
            ensureNonRoot: false,
            user: 0,
            readOnlyRootFilesystem: false,
          },
          resources: {
            cpu: { request: Cpu.millis(100), limit: Cpu.millis(500) },
            memory: {
              request: Size.mebibytes(256),
              limit: Size.mebibytes(512),
            },
          },
        },
      ],
    });
    app.scheduling.attract(cloudNode);
    app.exposeViaService({ name: "windmill-app" });

    // Workers
    for (const group of ["default", "native"]) {
      const worker = new Deployment(this, `workers-${group}`, {
        metadata: { annotations: keelAnnotations },
        replicas: 1,
        strategy: DeploymentStrategy.recreate(),
        terminationGracePeriod: Duration.seconds(604800),
        containers: [
          {
            image: "ghcr.io/windmill-labs/windmill:latest",
            envVariables: {
              DATABASE_URL: databaseUrl,
              BASE_URL: EnvValue.fromValue(`https://${props.hosts[0]}`),
              MODE: EnvValue.fromValue("worker"),
              WORKER_GROUP: EnvValue.fromValue(group),
              RUST_LOG: EnvValue.fromValue("info"),
              JSON_FMT: EnvValue.fromValue("true"),
            },
            securityContext: {
              ensureNonRoot: false,
              privileged: true,
              allowPrivilegeEscalation: true,
              readOnlyRootFilesystem: false,
            },
            resources: {
              cpu: { request: Cpu.millis(250), limit: Cpu.millis(1000) },
              memory: {
                request: Size.mebibytes(512),
                limit: Size.gibibytes(2),
              },
            },
          },
        ],
      });
      worker.scheduling.attract(cloudNode);
    }

    // Extra (LSP/debugger)
    const extra = new Deployment(this, "extra", {
      metadata: { annotations: keelAnnotations },
      replicas: 1,
      strategy: DeploymentStrategy.recreate(),
      containers: [
        {
          image: "ghcr.io/windmill-labs/windmill-extra:latest",
          ports: [
            { number: 3001, name: "lsp" },
            { number: 3002, name: "multiplayer" },
            { number: 3003, name: "debugger" },
          ],
          envVariables: {
            ENABLE_LSP: EnvValue.fromValue("true"),
            ENABLE_DEBUGGER: EnvValue.fromValue("true"),
            ENABLE_MULTIPLAYER: EnvValue.fromValue("false"),
            ENABLE_NSJAIL: EnvValue.fromValue("false"),
            DEBUGGER_PORT: EnvValue.fromValue("3003"),
            REQUIRE_SIGNED_DEBUG_REQUESTS: EnvValue.fromValue("true"),
            WINDMILL_BASE_URL: EnvValue.fromValue("http://windmill-app:8000"),
          },
          securityContext: {
            ensureNonRoot: false,
            user: 0,
            readOnlyRootFilesystem: false,
          },
          resources: {
            cpu: { request: Cpu.millis(50), limit: Cpu.millis(250) },
            memory: {
              request: Size.mebibytes(128),
              limit: Size.mebibytes(256),
            },
          },
        },
      ],
    });
    extra.scheduling.attract(cloudNode);
    extra.exposeViaService({ name: "windmill-extra" });

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
