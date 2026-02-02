import { Size } from "cdk8s";
import {
  PersistentVolumeAccessMode,
  PersistentVolumeClaim,
  PersistentVolumeClaimProps,
  Volume,
} from "cdk8s-plus-28";
import { Construct } from "constructs";

interface LocalPathPvcProps extends Partial<PersistentVolumeClaimProps> {
  namespace: string;
  name: string;
}

export const LOCAL_PATH_STORAGE_CLASS_NAME = "local-path";

export class LocalPathPvc extends Construct {
  private id: string;
  private name: string;
  private pvc: PersistentVolumeClaim;

  constructor(scope: Construct, id: string, props: LocalPathPvcProps) {
    super(scope, id);

    const { name, namespace, ...extra } = props;

    this.id = id;
    this.name = name;

    this.pvc = new PersistentVolumeClaim(this, id + "-pvc", {
      metadata: { name, namespace },
      storageClassName: LOCAL_PATH_STORAGE_CLASS_NAME,
      accessModes: [PersistentVolumeAccessMode.READ_WRITE_ONCE],
      storage: Size.gibibytes(10),
      ...extra,
    });
  }

  toVolume(name?: string) {
    return Volume.fromPersistentVolumeClaim(this, this.id + "-pv", this.pvc, {
      name: name ?? this.name,
    });
  }
}
