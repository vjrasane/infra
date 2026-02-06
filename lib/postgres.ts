import {
  EnvValue,
  LabeledNode,
  Protocol,
  Secret,
  Service,
  StatefulSet,
  Volume,
} from "cdk8s-plus-28";
import { Construct } from "constructs";
import { BitwardenOrgSecret } from "../charts/bitwarden";
import { LocalPathPvc } from "./local-path";

interface PostgresProps {
  namespace: string;
  name?: string;
  image?: string;
  volume?: Volume;
  credentials: PostgresCredentials;
  node?: LabeledNode;
}

export class Postgres extends Construct {
  readonly service: Service;

  constructor(scope: Construct, id: string, props: PostgresProps) {
    super(scope, id);

    const { namespace, volume, credentials, node } = props;

    const name = props.name ?? namespace + "-postgres";
    const image = props.image ?? "postgres:17";

    const dbVolume =
      volume ??
      new LocalPathPvc(this, "pvc", {
        namespace,
        name: name + "-data",
      }).toVolume();

    const dbPodLabels = { "app.kubernetes.io/name": name };
    this.service = new Service(this, "postgres-service", {
      metadata: { name, namespace, labels: dbPodLabels },
      clusterIP: "None",
      ports: [{ port: 5432, protocol: Protocol.TCP }],
    });
    const postgres = new StatefulSet(this, id + "-stateful-set", {
      metadata: {
        name,
        namespace: namespace,
        labels: dbPodLabels,
      },
      service: this.service,
      podMetadata: { labels: dbPodLabels },
      replicas: 1,
      volumes: [dbVolume],
      containers: [
        {
          name: "postgres",
          image,
          portNumber: 5432,
          envVariables: {
            POSTGRES_USER: credentials.user,
            POSTGRES_PASSWORD: credentials.password,
            POSTGRES_DB: credentials.database,
            PGDATA: EnvValue.fromValue("/var/lib/postgresql/data/pgdata"),
          },
          volumeMounts: [
            { path: "/var/lib/postgresql/data", volume: dbVolume },
          ],
          securityContext: {
            ensureNonRoot: false,
            readOnlyRootFilesystem: false,
          },
        },
      ],
    });

    if (node) postgres.scheduling.attract(node);
  }

  get serviceFqdn(): EnvValue {
    return EnvValue.fromValue(
      `${this.service.name}.${this.service.metadata.namespace}.svc.cluster.local`,
    );
  }
}

interface PostgresCredentialsProps {
  namespace: string;
  database?: string;
  user?: string;
  passwordSecretName?: string;
  passwordSecretId: string;
}

export class PostgresCredentials extends Construct {
  readonly user: EnvValue;
  readonly database: EnvValue;
  readonly password: EnvValue;

  readonly passwordSecretName: string;
  readonly passwordSecretKey = "password";

  constructor(scope: Construct, id: string, props: PostgresCredentialsProps) {
    super(scope, id);

    const { passwordSecretId, namespace } = props;

    this.passwordSecretName =
      props.passwordSecretName ?? namespace + "-postgres-credentials";
    const user = props.user ?? namespace;
    const database = props.database ?? user;

    this.user = EnvValue.fromValue(user);
    this.database = EnvValue.fromValue(database);

    const secret = new BitwardenOrgSecret(this, "bw-secret", {
      namespace,
      name: this.passwordSecretName,
      map: [
        {
          bwSecretId: passwordSecretId,
          secretKeyName: this.passwordSecretKey,
        },
      ],
    });

    this.password = EnvValue.fromSecretValue({
      secret: Secret.fromSecretName(this, "secret", secret.name),
      key: this.passwordSecretKey,
    });
  }
}
