import { decryptSops } from "sops-age";
import { Prettify } from "./lib/utils";

// export type Secrets = Omit<typeof encrypted, "sops">;

// export const secrets = (await decryptSops(encrypted)) as Secrets;
//
type InferSecrets<T> = Prettify<Omit<T, "sops">>;

export const decryptSecrets = async <TSecrets extends { sops: unknown }>(
  encrypted: TSecrets,
): Promise<InferSecrets<TSecrets>> => {
  const secrets = await decryptSops(encrypted);
  return secrets as InferSecrets<TSecrets>;
};
