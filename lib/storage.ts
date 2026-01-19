import { Construct } from "constructs";
import { Size } from "cdk8s";
import { Volume } from "cdk8s-plus-28";
import {
  KubePersistentVolume,
  KubePersistentVolumeClaim,
  Quantity,
} from "cdk8s-plus-28/lib/imports/k8s";

interface LocalVolumeBaseProps {
  readonly namespace: string;
  readonly path: string;
  readonly nodeName: string;
  readonly size: Size;
  readonly accessMode?: "ReadWriteOnce" | "ReadOnlyMany" | "ReadWriteMany";
}

type LocalVolumeProps = LocalVolumeBaseProps &
  (
    | {
        readonly name: string;
        readonly pvName?: never;
        readonly pvcName?: never;
      }
    | {
        readonly name?: never;
        readonly pvName: string;
        readonly pvcName: string;
      }
  );

export class LocalVolume extends Construct {
  public readonly volume: Volume;

  constructor(scope: Construct, id: string, props: LocalVolumeProps) {
    super(scope, id);

    const pvName = props.pvName ?? `${props.name}-pv`;
    const pvcName = props.pvcName ?? `${props.name}-pvc`;
    const accessMode = props.accessMode ?? "ReadWriteOnce";
    const sizeStr = `${props.size.toGibibytes()}Gi`;

    new KubePersistentVolume(this, "pv", {
      metadata: { name: pvName },
      spec: {
        capacity: { storage: Quantity.fromString(sizeStr) },
        accessModes: [accessMode],
        persistentVolumeReclaimPolicy: "Retain",
        storageClassName: "",
        local: { path: props.path },
        nodeAffinity: {
          required: {
            nodeSelectorTerms: [
              {
                matchExpressions: [
                  {
                    key: "kubernetes.io/hostname",
                    operator: "In",
                    values: [props.nodeName],
                  },
                ],
              },
            ],
          },
        },
      },
    });

    new KubePersistentVolumeClaim(this, "pvc", {
      metadata: { name: pvcName, namespace: props.namespace },
      spec: {
        accessModes: [accessMode],
        storageClassName: "",
        volumeName: pvName,
        resources: {
          requests: { storage: Quantity.fromString(sizeStr) },
        },
      },
    });

    this.volume = Volume.fromPersistentVolumeClaim(this, "volume", {
      name: pvcName,
    } as any);
  }
}
