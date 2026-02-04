import { Cron } from "cdk8s";
import { Namespace } from "cdk8s-plus-28";
import { Construct } from "constructs";
import { Gitea } from "../imports/gitea";
import {
  IngressRouteSpecRoutesServicesKind,
  IngressRouteSpecRoutesServicesPort,
} from "../imports/traefik.io";
import {
  CLOUD_PROVIDER_LABEL,
  labelExists,
  requiredNodeAffinity,
} from "../lib/affinity";
import { SecureIngressRoute } from "../lib/ingress";
import { LocalPathPvc } from "../lib/local-path";
import { ResticBackup, ResticCredentials, ResticPrune } from "../lib/restic";
import { BitwardenAuthTokenChart, BitwardenOrgSecret } from "./bitwarden";

interface GiteaChartProps {
  readonly hosts: string[];
  readonly authentikUrl: string;
  readonly resticRepository: string;
}

export class GiteaChart extends BitwardenAuthTokenChart {
  constructor(scope: Construct, id: string, props: GiteaChartProps) {
    const namespace = "gitea";
    super(scope, id, { namespace, ...props });

    new Namespace(this, "namespace", {
      metadata: { name: namespace },
    });

    const secret = new BitwardenOrgSecret(this, "bw-oidc-secret", {
      namespace,
      name: "gitea-oidc-secret",
      map: [
        {
          bwSecretId: "47d09975-dfa2-400b-90db-b3e700acb724",
          secretKeyName: "key",
        },
        {
          bwSecretId: "7c7326c4-42f7-4c23-813d-b3e700acf01d",
          secretKeyName: "secret",
        },
      ],
    });

    const pvc = new LocalPathPvc(this, "data-pvc", {
      namespace,
    });

    new Gitea(this, "helm-chart", {
      namespace,
      releaseName: "gitea",
      values: {
        postgresql: { enabled: false },
        "postgresql-ha": { enabled: false },
        valkey: { enabled: false },
        "valkey-cluster": { enabled: false },

        persistence: {
          enabled: true,
          create: false,
          claimName: pvc.name,
        },

        affinity: {
          nodeAffinity: requiredNodeAffinity(labelExists(CLOUD_PROVIDER_LABEL)),
        },

        strategy: {
          type: "Recreate",
        },

        gitea: {
          config: {
            service: {
              ALLOW_ONLY_EXTERNAL_REGISTRATION: "true",
              DISABLE_REGISTRATION: "true",
              ENABLE_BASIC_AUTHENTICATION: "false",
              ENABLE_PASSWORD_SIGNIN_FORM: "false",
              REQUIRE_SIGNIN_VIEW: "true",
            },
            database: {
              DB_TYPE: "sqlite3",
            },
            server: {
              ROOT_URL: `https://${props.hosts[0]}/`,
              SSH_DOMAIN: props.hosts[0],
            },
            packages: {
              ENABLED: "true",
            },
            openid: {
              ENABLE_OPENID_SIGNIN: "false",
              ENABLE_OPENID_SIGNUP: "false",
            },
            oauth2: {
              ENABLED: "true",
            },
            oauth2_client: {
              ENABLE_AUTO_REGISTRATION: "true",
              ACCOUNT_LINKING: "auto",
              UPDATE_AVATAR: "true",
              ADMIN_GROUP: "gitea-admins",
            },
          },

          oauth: [
            {
              name: "authentik",
              provider: "openidConnect",
              existingSecret: secret.name,
              autoDiscoverURL: `${props.authentikUrl}/application/o/gitea/.well-known/openid-configuration`,
              scopes: "openid email profile groups",
              groupClaimName: "groups",
              adminGroup: "gitea-admins",
            },
          ],
        },

        ingress: { enabled: false },
      },
    });

    new SecureIngressRoute(this, "ingress-route", {
      namespace,
      hosts: props.hosts,
      services: [
        {
          name: "gitea-http",
          port: IngressRouteSpecRoutesServicesPort.fromNumber(3000),
          kind: IngressRouteSpecRoutesServicesKind.SERVICE,
        },
      ],
      metadata: {
        annotations: {
          "gethomepage.dev/enabled": "true",
          "gethomepage.dev/name": "Gitea",
          "gethomepage.dev/description": "Git",
          "gethomepage.dev/group": "Apps",
          "gethomepage.dev/icon": "gitea.png",
          "gethomepage.dev/href": `https://${props.hosts[0]}`,
          "gethomepage.dev/pod-selector": "app.kubernetes.io/name=gitea",
        },
      },
    });

    const credentials = new ResticCredentials(this, "restic-credentials", {
      namespace,
      name: "gitea-restic-credentials", // pragma: allowlist secret
      accessKeyIdBwSecretId: "a46a4c87-a3cb-456f-84f2-b3e700f16f9d",
      accessKeySecretBwSecretId: "64cc6e3c-70fe-4b68-af44-b3e700f13ec9",
      resticPasswordBwSecretId: "8c07760e-5f05-44e6-930e-b3e700f4711e",
    }).toSecret(this, "restic-credentials-secret");

    const volume = pvc.toVolume(this, "pv");

    new ResticBackup(this, "restic-backup", {
      namespace,
      name: "gitea-backup",
      repository: props.resticRepository,
      credentials,
      hostName: "gitea",
      volume,
      schedule: Cron.schedule({ minute: "0", hour: "4" }),
    });

    new ResticPrune(this, "restic-prune", {
      namespace,
      name: "gitea-prune",
      repository: props.resticRepository,
      credentials,
      hostName: "gitea",
      schedule: Cron.schedule({ minute: "0", hour: "4", day: "1" }),
    });
  }
}
