import path from "path";
import { decryptSops } from "sops-age";
import { setupCronjob } from "../cronjob";
import { readFileSync } from "fs";

const script = readFileSync(path.join(__dirname, "update-dns.sh"), "utf8");
const secretsFile = path.join(__dirname, "cloudflare-secrets.env");

export const setupCloudflareDDNS = async (
  dnsRecords: string | string[],
  ipCmd: string,
  proxied = true,
) => {
  dnsRecords = Array.isArray(dnsRecords) ? dnsRecords : [dnsRecords];

  const secrets = await decryptSops({ path: secretsFile });

  let dnsChanged = false;
  for (const record of dnsRecords) {
    const { changed } = await setupCronjob(
      "update dns " + record,
      script,
      [record, `$(${ipCmd})`, String(proxied)],
      {
        deps: ["jq"],
        env: secrets,
        immediate: true,
      },
    );
    dnsChanged = dnsChanged || changed;
  }

  return { dnsChanged };
};
