import { Cron } from "cdk8s";
import { Namespace } from "cdk8s-plus-28";
import { Construct } from "constructs";
import { Actions } from "../imports/actions";
import { Gitea } from "../imports/gitea";
import {
  IngressRouteSpecRoutesServicesKind,
  IngressRouteSpecRoutesServicesPort,
  IngressRouteTcp,
  IngressRouteTcpSpecRoutesServicesPort,
} from "../imports/traefik.io";
import {
  CLOUD_PROVIDER_LABEL,
  labelExists,
  requiredNodeAffinity,
} from "../lib/affinity";
import { getHomeHost, getHomepageAnnotations } from "../lib/hosts";
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

    const oidcSecret = new BitwardenOrgSecret(this, "bw-oidc-secret", {
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

    const registrationTokenSecret = new BitwardenOrgSecret(
      this,
      "registration-token",
      {
        name: "gitea-registration-token-secret",
        map: [
          {
            bwSecretId: "70473ffc-636e-4825-bf3a-b3e800a8eb3f",
            secretKeyName: "token",
          },
        ],
      },
    );

    const pvc = new LocalPathPvc(this, "data-pvc");

    const sshPort = 2222;

    new Gitea(this, "helm-chart", {
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

        service: {
          ssh: {
            port: sshPort,
          },
        },

        gitea: {
          config: {
            actions: {
              ENABLED: "true",
            },
            repository: {
              DEFAULT_PRIVATE: "true",
              FORCE_PRIVATE: "true",
            },
            service: {
              ALLOW_ONLY_EXTERNAL_REGISTRATION: "true",
              DISABLE_REGISTRATION: "true",
              ENABLE_BASIC_AUTHENTICATION: "false",
              ENABLE_PASSWORD_SIGNIN_FORM: "false",
              ENABLE_PASSKEY_AUTHENTICATION: "false",
              REQUIRE_SIGNIN_VIEW: "true",
            },

            database: {
              DB_TYPE: "sqlite3",
            },
            server: {
              ROOT_URL: `https://${props.hosts[0]}/`,
              SSH_DOMAIN: props.hosts[0],
              SSH_PORT: sshPort.toString(),
              SSH_LISTEN_PORT: sshPort.toString(),
              DISABLE_HTTP_GIT: "true",
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
              existingSecret: oidcSecret.name,
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

    new Actions(this, "actions-runner", {
      releaseName: "gitea-actions",
      values: {
        enabled: true,
        existingSecret: registrationTokenSecret.name,
        existingSecretKey: "token",
        giteaRootURL: `https://${props.hosts[0]}`,
        statefulset: {
          replicas: 1,
        },
      },
    });

    new SecureIngressRoute(this, "ingress-route", {
      hosts: props.hosts,
      services: [
        {
          name: "gitea-http",
          port: IngressRouteSpecRoutesServicesPort.fromNumber(3000),
          kind: IngressRouteSpecRoutesServicesKind.SERVICE,
        },
      ],
      metadata: {
        annotations: getHomepageAnnotations("gitea", {
          host: getHomeHost(props.hosts),
        }),
      },
    });

    new IngressRouteTcp(this, "ssh-ingress", {
      metadata: { name: "gitea-ssh" },
      spec: {
        entryPoints: ["ssh"],
        routes: [
          {
            match: "HostSNI(`*`)", // SSH has no SNI, so match all
            services: [
              {
                name: "gitea-ssh",
                port: IngressRouteTcpSpecRoutesServicesPort.fromNumber(sshPort),
              },
            ],
          },
        ],
      },
    });

    const credentials = new ResticCredentials(this, "restic-credentials", {
      name: "gitea-restic-credentials", // pragma: allowlist secret
      accessKeyIdBwSecretId: "a46a4c87-a3cb-456f-84f2-b3e700f16f9d",
      accessKeySecretBwSecretId: "64cc6e3c-70fe-4b68-af44-b3e700f13ec9",
      resticPasswordBwSecretId: "8c07760e-5f05-44e6-930e-b3e700f4711e",
    }).toSecret();

    const volume = pvc.toVolume();

    new ResticBackup(this, "restic-backup", {
      name: "gitea-backup",
      repository: props.resticRepository,
      credentials,
      hostName: "gitea",
      volume,
      schedule: Cron.schedule({ minute: "0", hour: "4" }),
    });

    new ResticPrune(this, "restic-prune", {
      name: "gitea-prune",
      repository: props.resticRepository,
      credentials,
      hostName: "gitea",
      schedule: Cron.schedule({ minute: "0", hour: "4", day: "1" }),
    });
  }
}
