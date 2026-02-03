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
  name?: string;
}

export const LOCAL_PATH_STORAGE_CLASS_NAME = "local-path";

export class LocalPathPvc extends PersistentVolumeClaim {
  constructor(scope: Construct, id: string, props: LocalPathPvcProps) {
    const { namespace, ...extra } = props;
    const name = props.name ?? namespace + "-local-path-pvc";
    super(scope, id, {
      metadata: { name, namespace },
      storageClassName: LOCAL_PATH_STORAGE_CLASS_NAME,
      accessModes: [PersistentVolumeAccessMode.READ_WRITE_ONCE],
      storage: Size.gibibytes(10),
      ...extra,
    });
  }

  toVolume = (scope: Construct, id: string, name?: string) => {
    return Volume.fromPersistentVolumeClaim(scope, id, this, {
      name: name ?? this.name,
    });
  };
}
