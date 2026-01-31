import {
  EnvValue,
  LabeledNode,
  Node,
  NodeLabelQuery,
  Protocol,
  Service,
  StatefulSet,
  Volume,
} from "cdk8s-plus-28";
import { Construct } from "constructs";

interface PostgresProps {
  namespace: string;
  name: string;
  volume: Volume;
  dbName: EnvValue;
  dbUser: EnvValue;
  dbPassword: EnvValue;
  node?: LabeledNode;
}

export class Postgres extends Construct {
  constructor(scope: Construct, id: string, props: PostgresProps) {
    super(scope, id);

    const { name, namespace, volume, dbName, dbUser, dbPassword, node } = props;
    const dbPodLabels = { "app.kubernetes.io/name": name };
    const dbService = new Service(this, name, {
      metadata: { name: name, namespace, labels: dbPodLabels },
      clusterIP: "None",
      ports: [{ port: 5432, protocol: Protocol.TCP }],
    });
    const postgres = new StatefulSet(this, id + "-stateful-set", {
      metadata: {
        name: name,
        namespace: namespace,
        labels: dbPodLabels,
      },
      service: dbService,
      podMetadata: { labels: dbPodLabels },
      replicas: 1,
      volumes: [volume],
      containers: [
        {
          name: "postgres",
          image: "tensorchord/pgvecto-rs:pg17-v0.4.0",
          portNumber: 5432,
          envVariables: {
            POSTGRES_USER: dbUser,
            POSTGRES_PASSWORD: dbPassword,
            //   EnvValue.fromSecretValue({
            //   secret: { name: credentialsSecretName } as any,
            //   key: "password",
            // }),
            POSTGRES_DB: dbName,
            PGDATA: EnvValue.fromValue("/var/lib/postgresql/data/pgdata"),
          },
          volumeMounts: [{ path: "/var/lib/postgresql/data", volume }],
          securityContext: {
            ensureNonRoot: false,
            readOnlyRootFilesystem: false,
          },
        },
      ],
    });

    if (node) postgres.scheduling.attract(node);
  }
}
