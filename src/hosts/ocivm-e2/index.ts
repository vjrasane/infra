import path from "path";
import { setupCloudflareDDNS } from "../../lib/cloudflare-ddns";
import { Service, setupServices, TraefikService } from "../../lib/services";
import { hostRun } from "../../lib/inventory";
import { ocivm_e2 } from "../../inventory";

const servicesDir = path.join(__dirname, "services");

const gatusConfig = path.join(__dirname, "gatus-config.yml");

const deploy = async () => {
  const { dnsChanged } = await setupCloudflareDDNS(
    "gatus.karkki.org",
    "tailscale ip -4",
  );

  const traefik = new TraefikService(path.join(servicesDir, "traefik.yml"));
  await setupServices(
    traefik,
    new Service("gatus", path.join(servicesDir, "gatus.yml"), {
      files: [gatusConfig],
    }),
  );

  if (dnsChanged) await traefik.refreshCert();
};

export default hostRun(deploy, ocivm_e2);
