import { Construct } from "constructs";
import { ChartProps, Size, Cron } from "cdk8s";
import {
  Namespace,
  Deployment,
  EnvValue,
  Volume,
  ConfigMap,
  Protocol,
} from "cdk8s-plus-28";
import {
  KubePersistentVolume,
  KubePersistentVolumeClaim,
  Quantity,
} from "cdk8s-plus-28/lib/imports/k8s";
import { BitwardenAuthTokenChart, BitwardenOrgSecret } from "./bitwarden";
import { ResticBackup, ResticCredentials, ResticPrune } from "../lib/restic";

// Convert object to INI format for smb.conf
type SmbSection = Record<string, string | number | boolean>;
type SmbConfig = Record<string, SmbSection>;

function toIni(config: SmbConfig): string {
  return Object.entries(config)
    .map(([section, values]) => {
      const header = `[${section}]`;
      const lines = Object.entries(values).map(
        ([key, value]) => `${key} = ${value}`,
      );
      return [header, ...lines].join("\n");
    })
    .join("\n\n");
}

interface SambaChartProps extends ChartProps {
  readonly storageSize: Size;
  readonly storagePath: string;
  readonly nodeName: string;

  readonly resticRepository: string;
}

export class SambaChart extends BitwardenAuthTokenChart {
  constructor(scope: Construct, id: string, props: SambaChartProps) {
    const namespace = "samba";
    super(scope, id, { ...props, namespace });

    const username = "samba";
    const pvName = "samba-pv";
    const pvcName = "samba-data";

    new Namespace(this, "namespace", {
      metadata: { name: namespace },
    });

    // Samba credentials from Bitwarden
    const credentialsSecretName = "samba-credentials"; // pragma: allowlist secret
    new BitwardenOrgSecret(this, "credentials-secret", {
      metadata: { name: credentialsSecretName, namespace },
      spec: {
        secretName: credentialsSecretName,
        map: [
          {
            bwSecretId: "31406ff6-6d88-4694-82e6-b3d400b71b05",
            secretKeyName: "password", // pragma: allowlist secret
          },
        ],
      },
    });

    // Static PersistentVolume for dedicated SSD
    new KubePersistentVolume(this, "pv", {
      metadata: { name: pvName },
      spec: {
        capacity: {
          storage: Quantity.fromString(`${props.storageSize.toGibibytes()}Gi`),
        },
        accessModes: ["ReadWriteOnce"],
        persistentVolumeReclaimPolicy: "Retain",
        storageClassName: "",
        local: { path: props.storagePath },
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

    // PVC that binds to the static PV
    new KubePersistentVolumeClaim(this, "pvc", {
      metadata: { name: pvcName, namespace },
      spec: {
        accessModes: ["ReadWriteOnce"],
        storageClassName: "",
        volumeName: pvName,
        resources: {
          requests: {
            storage: Quantity.fromString(
              `${props.storageSize.toGibibytes()}Gi`,
            ),
          },
        },
      },
    });

    // Samba configuration as typed object, converted to INI
    const smbConfig: SmbConfig = {
      global: {
        workgroup: "WORKGROUP",
        "server string": "Samba Server",
        security: "user",
        "map to guest": "Bad User",
        "log file": "/var/log/samba/%m.log",
        "max log size": 50,
      },
      share: {
        path: "/data",
        browseable: "yes",
        writable: "yes",
        "guest ok": "no",
        "valid users": username,
        "create mask": "0664",
        "directory mask": "0775",
      },
    };

    const configMap = new ConfigMap(this, "smb-config", {
      metadata: { name: "samba-config", namespace },
      data: {
        "smb.conf": toIni(smbConfig),
      },
    });
    const configVolume = Volume.fromConfigMap(
      this,
      "config-volume",
      configMap,
      {
        name: "samba-config",
      },
    );

    // Data volume from PVC (reference by name since we used KubePersistentVolumeClaim)
    const dataVolume = Volume.fromPersistentVolumeClaim(this, "data-volume", {
      name: pvcName,
    } as any);

    // Samba Deployment with hostNetwork for direct access via node hostname
    const podLabels = { "app.kubernetes.io/name": "samba" };
    new Deployment(this, "samba", {
      metadata: { name: "samba", namespace, labels: podLabels },
      podMetadata: { labels: podLabels },
      replicas: 1,
      hostNetwork: true,
      volumes: [dataVolume, configVolume],
      containers: [
        {
          name: "samba",
          image: "dperson/samba:latest",
          ports: [
            { number: 445, protocol: Protocol.TCP, name: "smb" },
            { number: 139, protocol: Protocol.TCP, name: "netbios" },
          ],
          envVariables: {
            USERID: EnvValue.fromValue("1000"),
            GROUPID: EnvValue.fromValue("1000"),
            USER: EnvValue.fromValue(username),
            SAMBA_PASSWORD: EnvValue.fromSecretValue({
              secret: { name: credentialsSecretName } as any,
              key: "password",
            }),
          },
          command: ["/bin/bash", "-c"],
          args: [
            `cp /config/smb.conf /etc/samba/smb.conf && \\
useradd -M -s /sbin/nologin ${username} 2>/dev/null || true && \\
echo -e "$SAMBA_PASSWORD\\n$SAMBA_PASSWORD" | smbpasswd -a -s ${username} && \\
smbd --foreground --no-process-group --log-stdout`,
          ],
          volumeMounts: [
            { path: "/data", volume: dataVolume },
            { path: "/config", volume: configVolume },
          ],
          securityContext: {
            ensureNonRoot: false,
            readOnlyRootFilesystem: false,
          },
        },
      ],
    });

    // Restic backup to B2
    const credentials = new ResticCredentials(this, "restic-credentials", {
      namespace,
      name: "samba-restic-credentials", // pragma: allowlist secret
      accessKeyIdBwSecretId: "43c2041e-177f-494d-b78a-b3d60141f01f",
      accessKeySecretBwSecretId: "98e48367-4a09-40e0-977b-b3d60141da4d",
      resticPassowrdBwSecretId: "31406ff6-6d88-4694-82e6-b3d400b71b05",
    });

    const hostName = "samba";

    new ResticBackup(this, "restic-backup", {
      namespace,
      name: "samba-backup",
      repository: props.resticRepository,
      credentialsSecretName: credentials.secretName,
      hostName,
      volume: dataVolume,
      volumeMountPath: "/data",
      schedule: Cron.schedule({ minute: "0", hour: "4", weekDay: "0" }), // Sunday 4 AM
    });

    new ResticPrune(this, "restic-prune", {
      namespace,
      name: "samba-prune",
      repository: props.resticRepository,
      credentialsSecretName: credentials.secretName,
      hostName,
      schedule: Cron.schedule({ minute: "0", hour: "5", day: "1" }), // 1st of month 5 AM
    });
  }
}
