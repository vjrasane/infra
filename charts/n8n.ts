import { Size } from "cdk8s";
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
import { SecureIngressRoute } from "../lib/ingress";
import { LocalPathPvc } from "../lib/local-path";
import { BitwardenAuthTokenChart, BitwardenOrgSecret } from "./bitwarden";

interface N8nChartProps {
  readonly hosts: string[];
  readonly authentikUrl: string;
}

export class N8nChart extends BitwardenAuthTokenChart {
  constructor(scope: Construct, id: string, props: N8nChartProps) {
    const namespace = "n8n";
    super(scope, id, { namespace, ...props });

    new Namespace(this, "namespace", { metadata: { name: namespace } });

    const dataVolume = new LocalPathPvc(this, "data-pvc").toVolume();

    const encryptionKey = new BitwardenOrgSecret(this, "encryption-key", {
      name: "n8n-encryption-key",
      map: [
        {
          bwSecretId: "198486ae-d1bf-4dff-8d28-b3eb00c4e62e",
          secretKeyName: "N8N_ENCRYPTION_KEY",
        },
      ],
    }).toSecret();

    const oidc = new BitwardenOrgSecret(this, "oidc-secret", {
      name: "n8n-oidc",
      map: [
        {
          bwSecretId: "5c896b9a-c8cf-48c7-bfa4-b3eb00c6deb7",
          secretKeyName: "OIDC_CLIENT_ID",
        },
        {
          bwSecretId: "650fb4fb-e17d-463a-85aa-b3eb00c6ec63",
          secretKeyName: "OIDC_CLIENT_SECRET",
        },
      ],
    }).toSecret();

    const hooksVolume = Volume.fromEmptyDir(this, "hooks-volume", "oidc-hooks");

    const n8n = new Deployment(this, "deployment", {
      replicas: 1,
      strategy: DeploymentStrategy.recreate(),
      volumes: [dataVolume, hooksVolume],
      initContainers: [
        {
          image: "curlimages/curl:latest",
          command: ["/bin/sh", "-c"],
          args: [
            "curl -fsSL https://raw.githubusercontent.com/cweagans/n8n-oidc/$COMMIT_SHA/hooks.js -o /hooks/hooks.js",
          ],
          envVariables: {
            COMMIT_SHA: EnvValue.fromValue(
              "7fd7a64b7fc94cd7b1bd38699e2a4bbbe0d69561",
            ),
          },
          volumeMounts: [{ path: "/hooks", volume: hooksVolume }],
          securityContext: {
            ensureNonRoot: false,
            readOnlyRootFilesystem: false,
          },
        },
      ],
      containers: [
        {
          image: "docker.n8n.io/n8nio/n8n:latest",
          ports: [{ number: 5678 }],
          envVariables: {
            N8N_HOST: EnvValue.fromValue(props.hosts[0]),
            N8N_PROTOCOL: EnvValue.fromValue("https"),
            N8N_TRUST_PROXY: EnvValue.fromValue("true"),
            N8N_PROXY_HOPS: EnvValue.fromValue("1"),
            N8N_LOG_LEVEL: EnvValue.fromValue("debug"),
            WEBHOOK_URL: EnvValue.fromValue(`https://${props.hosts[0]}/`),
            DB_TYPE: EnvValue.fromValue("sqlite"),

            // OIDC hooks configuration
            EXTERNAL_HOOK_FILES: EnvValue.fromValue("/oidc/hooks.js"),
            EXTERNAL_FRONTEND_HOOKS_URLS: EnvValue.fromValue(
              "/assets/oidc-frontend-hook.js",
            ),
            N8N_ADDITIONAL_NON_UI_ROUTES: EnvValue.fromValue("auth"),

            // OIDC provider settings
            OIDC_ISSUER_URL: EnvValue.fromValue(
              `${props.authentikUrl}/application/o/n8n/`,
            ),
            OIDC_REDIRECT_URI: EnvValue.fromValue(
              `https://${props.hosts[0]}/auth/oidc/callback`,
            ),
          },
          envFrom: [Env.fromSecret(encryptionKey), Env.fromSecret(oidc)],
          volumeMounts: [
            { path: "/home/node/.n8n", volume: dataVolume },
            { path: "/oidc", volume: hooksVolume },
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

    SecureIngressRoute.fromService(this, "ingress", n8n, {
      hosts: props.hosts,
    });
  }
}
