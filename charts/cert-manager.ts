import { Construct } from "constructs";
import { ChartProps, Helm } from "cdk8s";
import { Namespace } from "cdk8s-plus-28";
import { ClusterIssuer } from "../imports/cert-manager.io";
import { BitwardenAuthTokenChart, BitwardenOrgSecret } from "./bitwarden";

interface CertManagerChartProps extends ChartProps {
  readonly clusterIssuerName: string;
  readonly values?: Record<string, unknown>;
}

export class CertManagerChart extends BitwardenAuthTokenChart {
  constructor(scope: Construct, id: string, props: CertManagerChartProps) {
    const namespace = "cert-manager";
    super(scope, id, { ...props, namespace });

    new Namespace(this, "namespace", {
      metadata: {
        name: namespace,
      },
    });

    new Helm(this, "cert-manager", {
      chart: "cert-manager",
      repo: "https://charts.jetstack.io",
      version: "v1.19.2",
      namespace: namespace,
      releaseName: "cert-manager",
      values: {
        crds: {
          enabled: true,
        },
        ...props.values,
      },
    });

    // Cloudflare API key secret from Bitwarden
    const cloudflareSecretName = "cloudflare"; // pragma: allowlist secret
    new BitwardenOrgSecret(this, "cloudflare-secret", {
      metadata: {
        name: cloudflareSecretName,
        namespace,
      },
      spec: {
        secretName: cloudflareSecretName,
        map: [
          {
            bwSecretId: "d5a7351c-a839-49f5-a67f-b2dc0131528b",
            secretKeyName: "api-key", // pragma: allowlist secret
          },
        ],
      },
    });

    // ClusterIssuer for Let's Encrypt with Cloudflare DNS01
    new ClusterIssuer(this, "cloudflare-issuer", {
      metadata: {
        name: props.clusterIssuerName,
      },
      spec: {
        acme: {
          server: "https://acme-v02.api.letsencrypt.org/directory",
          email: "cloudflare@vjm.anonaddy.me",
          privateKeySecretRef: {
            name: "cloudflare-issuer-key",
          },
          solvers: [
            {
              dns01: {
                cloudflare: {
                  email: "cloudflare@vjm.anonaddy.me",
                  apiKeySecretRef: {
                    name: cloudflareSecretName,
                    key: "api-key",
                  },
                },
              },
            },
          ],
        },
      },
    });
  }
}
