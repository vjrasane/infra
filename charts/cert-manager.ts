import { Helm } from "cdk8s";
import { Namespace } from "cdk8s-plus-28";
import { Construct } from "constructs";
import { ClusterIssuer } from "../imports/cert-manager.io";
import { CLUSTER_ISSUER_NAME } from "../lib/ingress";
import { BitwardenAuthTokenChart, BitwardenOrgSecret } from "./bitwarden";

export class CertManagerChart extends BitwardenAuthTokenChart {
  constructor(scope: Construct, id: string) {
    const namespace = "cert-manager";
    super(scope, id, { namespace });

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
      },
    });

    // Cloudflare API key secret from Bitwarden
    const cloudflareSecret = new BitwardenOrgSecret(this, "cloudflare-secret", {
      namespace,
      name: "cloudflare",
      map: [
        {
          bwSecretId: "d5a7351c-a839-49f5-a67f-b2dc0131528b",
          secretKeyName: "api-key", // pragma: allowlist secret
        },
      ],
    });

    // ClusterIssuer for Let's Encrypt with Cloudflare DNS01
    new ClusterIssuer(this, "cloudflare-issuer", {
      metadata: {
        name: CLUSTER_ISSUER_NAME,
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
                    name: cloudflareSecret.name,
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
