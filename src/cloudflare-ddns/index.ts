import { setupCronjob } from "../lib/cronjob";
import encrypted from "./cloudflare-secrets.json";
import { decryptSecrets } from "../secrets";
import scriptContent from "./update-dns.sh";
import { file, commonPerms as perms } from "../lib/files";

export const cloudflareSecrets = () => decryptSecrets(encrypted);

const scriptFile = file("/opt/cloudflare-ddns", scriptContent, perms);

type CloudflareDdnsOpts = {
  ipCmd?: string;
  proxied?: boolean;
};

const defaultIpCmd = "curl ipinfo.io/ip";

export const setupCloudflareDDNS = async (
  dnsRecords: string | string[],
  opts: CloudflareDdnsOpts = {},
) => {
  dnsRecords = Array.isArray(dnsRecords) ? dnsRecords : [dnsRecords];
  const { ipCmd = defaultIpCmd, proxied = true } = opts;

  let dnsChanged = false;

  dnsChanged = dnsChanged || (await scriptFile.create());
  for (const record of dnsRecords) {
    const cronScript = `${scriptFile.path} ${record} $(${ipCmd} ${String(proxied)})`;
    const changed = await setupCronjob("update dns " + record, cronScript, {
      env: await cloudflareSecrets(),
    });
    dnsChanged = dnsChanged || changed;
  }

  return { dnsChanged };
};
