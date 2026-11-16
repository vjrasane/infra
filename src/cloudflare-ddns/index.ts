import { setupCronjob } from "../lib/cronjob";
import encrypted from "./cloudflare-secrets.json";
import { decryptSecrets } from "../secrets";
import script from "./cloudflare-ddns.sh";

export const cloudflareSecrets = () => decryptSecrets(encrypted);

export const setupCloudflareDDNS = async (
  dnsRecords: string | string[],
  ipCmd: string,
  proxied = true,
) => {
  dnsRecords = Array.isArray(dnsRecords) ? dnsRecords : [dnsRecords];

  let dnsChanged = false;
  for (const record of dnsRecords) {
    const { changed } = await setupCronjob(
      "update dns " + record,
      script,
      [record, `$(${ipCmd})`, String(proxied)],
      {
        deps: ["jq"],
        env: await cloudflareSecrets(),
        immediate: true,
      },
    );
    dnsChanged = dnsChanged || changed;
  }

  return { dnsChanged };
};
