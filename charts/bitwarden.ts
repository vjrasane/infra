import { Construct } from "constructs";
import { Chart, ChartProps, Helm } from "cdk8s";
import { Namespace, Secret } from "cdk8s-plus-28";
import {
  BitwardenSecret,
  BitwardenSecretProps,
} from "../imports/k8s.bitwarden.com";
import { isNil, omitBy } from "lodash/fp";

export class BitwardenSecretsManagerChart extends Chart {
  constructor(scope: Construct, id: string, props: ChartProps = {}) {
    super(scope, id, {
      ...props,
    });

    const namespace = "bitwarden";

    new Namespace(this, "namespace", {
      metadata: {
        name: namespace,
      },
    });

    new Helm(this, "sm-operator", {
      chart: "sm-operator",
      repo: "https://charts.bitwarden.com",
      version: "1.1.0",
      namespace: namespace,
      releaseName: "bw-sm",
    });
  }
}

const BW_ACCESS_TOKEN = process.env.BWS_ACCESS_TOKEN;

if (BW_ACCESS_TOKEN == null || BW_ACCESS_TOKEN == "") {
  throw new Error("BWS_ACCESS_TOKEN not set");
}

const AUTH_TOKEN_SECRET_NAME = "bw-auth-token"; // pragma: allowlist secret

export abstract class BitwardenAuthTokenChart extends Chart {
  constructor(scope: Construct, id: string, props: ChartProps) {
    super(scope, id, {
      ...props,
    });

    new Secret(this, "bw-auth-token", {
      metadata: {
        name: AUTH_TOKEN_SECRET_NAME,
        namespace: props.namespace,
      },
      stringData: {
        token: BW_ACCESS_TOKEN!,
      },
    });
  }
}

interface BitwardenOrgSecretProps extends Partial<BitwardenSecretProps> {
  readonly namespace?: string;
  readonly name?: string;
  readonly secretName?: string;
  readonly map: Array<{ bwSecretId: string; secretKeyName: string }>;
}

export class BitwardenOrgSecret extends BitwardenSecret {
  readonly secretName: string;
  constructor(scope: Construct, id: string, props: BitwardenOrgSecretProps) {
    const { namespace, map, ...extra } = props;
    const name = props.name ?? namespace;
    const secretName = props.secretName ?? name ?? id;
    super(scope, id, {
      metadata: omitBy(isNil, {
        namespace,
        name,
      }),
      spec: {
        secretName,
        organizationId: "60ceb718-168e-4c92-acbc-b2dc012f1217",
        authToken: {
          secretName: AUTH_TOKEN_SECRET_NAME,
          secretKey: "token", // pragma: allowlist secret
        },
        map,
      },
      ...extra,
    });

    this.secretName = secretName;
  }

  toSecret = () => {
    return Secret.fromSecretName(this, "secret", this.secretName);
  };
}
