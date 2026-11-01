import { readFileSync } from "node:fs";
import path from "path";
import { setupCloudflareDDNS } from "../../lib/cloudflare-ddns";
import { decryptSops } from "sops-age";
import { refreshTraefikCert, setupServices } from "../../lib/services";
import { copy } from "module-runner/builtin";
import { hostRun } from "../../lib/inventory";
import { ocivm_e2 } from "../../inventory";

const gatusConfig = readFileSync(
  path.join(__dirname, "gatus-config.yml"),
  "utf8",
);

const deploy = async () => {
  const secrets: Record<string, string> = await decryptSops({
    path: path.join(__dirname, "secrets.env"),
  });

  const { dnsChanged } = await setupCloudflareDDNS(
    "gatus.karkki.org",
    "tailscale ip -4",
  );

  await copy("Copy gatus config", {
    content: gatusConfig,
    dest: setupServices.servicesDir + "/gatus-config.yml",
  });

  await setupServices(
    path.join(__dirname, "docker-compose.yml"),
    ["traefik", "gatus"],
    secrets,
  );

  if (dnsChanged) await refreshTraefikCert();
};

export default hostRun(deploy, ocivm_e2);
