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
import { isNil, omitBy } from "lodash/fp";
import { BitwardenOrgSecret } from "../charts/bitwarden";
import { LocalPathPvc } from "./local-path";

interface PostgresProps {
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

    const { volume, credentials, node } = props;

    const image = props.image ?? "postgres:17";

    const dbVolume =
      volume ??
      new LocalPathPvc(this, "pvc", {
        name: props.name,
      }).toVolume();

    this.service = new Service(this, "postgres-service", {
      metadata: omitBy(isNil, {
        name: props.name,
      }),
      clusterIP: "None",
      ports: [{ port: 5432, protocol: Protocol.TCP }],
    });

    const postgres = new StatefulSet(this, id + "-stateful-set", {
      metadata: omitBy(isNil, {
        name: props.name,
      }),
      service: this.service,
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
  database: string;
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

    const { database, passwordSecretId } = props;

    const user = props.user ?? database;
    this.passwordSecretName =
      props.passwordSecretName ?? database + "-postgres-credentials";

    this.user = EnvValue.fromValue(user);
    this.database = EnvValue.fromValue(database);

    const secret = new BitwardenOrgSecret(this, "bw-secret", {
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
