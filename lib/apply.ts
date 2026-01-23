import * as k8s from "@kubernetes/client-node";

export interface KubernetesManifest {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace?: string;
  };
  [key: string]: unknown;
}

type KubernetesObjectHeader = k8s.KubernetesObject & {
  metadata: { name: string; namespace?: string };
};

export function createClient(): k8s.KubernetesObjectApi {
  const kc = new k8s.KubeConfig();
  kc.loadFromDefault();
  return k8s.KubernetesObjectApi.makeApiClient(kc);
}

export async function apply(
  client: k8s.KubernetesObjectApi,
  manifest: KubernetesManifest,
): Promise<void> {
  const { kind, metadata } = manifest;
  const name = metadata.name;
  const namespace = metadata.namespace ?? "default";
  const obj = manifest as KubernetesObjectHeader;

  try {
    await client.read(obj);
    console.log(`Updating ${kind}/${name} in ${namespace}`);
    await client.patch(obj);
  } catch (e: unknown) {
    const err = e as { statusCode?: number };
    if (err.statusCode === 404) {
      console.log(`Creating ${kind}/${name} in ${namespace}`);
      await client.create(obj);
    } else {
      throw e;
    }
  }
}

export async function applyManifests(
  client: k8s.KubernetesObjectApi,
  manifests: KubernetesManifest[],
): Promise<void> {
  for (const manifest of manifests) {
    await apply(client, manifest);
  }
}
