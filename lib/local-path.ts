import { Size } from "cdk8s";
import {
  PersistentVolumeAccessMode,
  PersistentVolumeClaim,
  PersistentVolumeClaimProps,
  PersistentVolumeClaimVolumeOptions,
  Volume,
} from "cdk8s-plus-28";
import { Construct } from "constructs";
import { isNil, omitBy } from "lodash/fp";

interface LocalPathPvcProps extends Partial<PersistentVolumeClaimProps> {
  namespace?: string;
  name?: string;
}

export const LOCAL_PATH_STORAGE_CLASS_NAME = "local-path";

export class LocalPathPvc extends PersistentVolumeClaim {
  constructor(scope: Construct, id: string, props: LocalPathPvcProps = {}) {
    const { namespace, ...extra } = props;
    let name;
    if (props.name) name = props.name;
    else if (namespace) name = namespace + "-local-path-pvc";
    super(scope, id, {
      metadata: omitBy(isNil, { name, namespace }),
      storageClassName: LOCAL_PATH_STORAGE_CLASS_NAME,
      accessModes: [PersistentVolumeAccessMode.READ_WRITE_ONCE],
      storage: Size.gibibytes(10),
      ...extra,
    });
  }

  toVolume = (opts?: PersistentVolumeClaimVolumeOptions) => {
    return Volume.fromPersistentVolumeClaim(this, "volume", this, opts);
  };
}
