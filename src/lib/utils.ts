import { decryptSops } from "sops-age";

export const toEnvFile = (vars: Record<string, string>): string =>
  Object.entries(vars)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n") + "\n";

export const decryptSopsEnvFile = async (path: string) => {
  return toEnvFile(await decryptSops({ path }));
};
