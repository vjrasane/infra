import { Construct } from "constructs";
import { Chart, ChartProps, Helm } from "cdk8s";
import { Namespace } from "cdk8s-plus-28";
import { IpAddressPool } from "../imports/metallb-ipaddresspools-metallb.io";
import { L2Advertisement } from "../imports/metallb-l2advertisements-metallb.io";

interface MetalLBChartProps extends ChartProps {
  readonly addresses: string[];
}

export class MetalLBChart extends Chart {
  constructor(scope: Construct, id: string, props: MetalLBChartProps) {
    super(scope, id, { ...props });

    const namespace = "metallb-system";

    new Namespace(this, "namespace", {
      metadata: {
        name: namespace,
      },
    });

    new Helm(this, "metallb", {
      chart: "metallb",
      repo: "https://metallb.github.io/metallb",
      version: "0.15.3",
      namespace: namespace,
      releaseName: "metallb",
    });

    new IpAddressPool(this, "ip-pool", {
      metadata: {
        name: "metallb-ip-pool",
        namespace: namespace,
      },
      spec: {
        addresses: props.addresses,
        autoAssign: true,
      },
    });

    new L2Advertisement(this, "l2-advertisement", {
      metadata: {
        name: "metallb-ip-advertisement",
        namespace: namespace,
      },
    });
  }
}
