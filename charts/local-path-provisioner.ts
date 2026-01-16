import { Construct } from "constructs";
import { Chart, ChartProps, Helm } from "cdk8s";

interface NodePathMapping {
  readonly node: string;
  readonly paths: string[];
}

interface LocalPathProvisionerChartProps extends ChartProps {
  readonly nodePathMap: NodePathMapping[];
  readonly storageClassName: string;
}

export class LocalPathProvisionerChart extends Chart {
  constructor(
    scope: Construct,
    id: string,
    props: LocalPathProvisionerChartProps,
  ) {
    super(scope, id, { ...props });

    new Helm(this, "local-path-provisioner", {
      chart: "local-path-provisioner",
      repo: "https://containeroo.github.io/helm-charts",
      namespace: "kube-system",
      releaseName: "local-path-provisioner",
      values: {
        nodePathMap: props.nodePathMap,
        storageClass: {
          name: props.storageClassName,
          reclaimPolicy: "Retain",
        },
      },
    });
  }
}
