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
    const script = scriptFile.script([record, `$(${ipCmd})`, String(proxied)], {
      env: await cloudflareSecrets(),
    });
    const cronjob = script.cronjob("update dns " + record, { minute: "*/5" });
    const changed = await cronjob.create();

    dnsChanged = dnsChanged || changed;
  }

  return { dnsChanged };
};
