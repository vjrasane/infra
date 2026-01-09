import { Construct } from "constructs";
import { Chart, ChartProps, Helm } from "cdk8s";
import { Namespace, Secret } from "cdk8s-plus-28";
import { BitwardenSecret } from "../imports/k8s.bitwarden.com";

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
  throw new Error("BW_ACCESS_TOKEN not set");
}

const AUTH_TOKEN_SECRET_NAME = "bw-auth-token";

interface BitwardenAuthTokenChartProps extends ChartProps {
  readonly namespace: string;
}

export abstract class BitwardenAuthTokenChart extends Chart {
  constructor(
    scope: Construct,
    id: string,
    props: BitwardenAuthTokenChartProps,
  ) {
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

interface BitwardenOrgSecretProps {
  readonly metadata: { name: string; namespace: string };
  readonly spec: {
    readonly secretName: string;
    readonly map: Array<{ bwSecretId: string; secretKeyName: string }>;
  };
}

export class BitwardenOrgSecret extends BitwardenSecret {
  constructor(scope: Construct, id: string, props: BitwardenOrgSecretProps) {
    super(scope, id, {
      metadata: props.metadata,
      spec: {
        ...props.spec,
        organizationId: "60ceb718-168e-4c92-acbc-b2dc012f1217",
        authToken: {
          secretName: AUTH_TOKEN_SECRET_NAME,
          secretKey: "token",
        },
      },
    });
  }
}
