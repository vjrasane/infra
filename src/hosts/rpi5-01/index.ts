import { readFileSync } from "node:fs";
import path from "path";
import { setupCloudflareDDNS } from "../../lib/cloudflare-ddns";
import { setupCronjob } from "../../lib/cronjob";
import { setupResticBackup } from "../../lib/restic-backup";
import { Service, setupServices, TraefikService } from "../../lib/services";
import { hostRun } from "../../lib/inventory";
import { rpi5_01 } from "../../inventory";
import { homelabResticRepo } from "../../restic";
import { setupSambaShare } from "../../lib/samba";

const cloudflareFirewallScript = readFileSync(
  path.join(__dirname, "set-cloudflare-firewall.sh"),
  "utf8",
);

const traefikCloudflareIpsScript = readFileSync(
  path.join(__dirname, "set-traefik-cloudflare-ips.sh"),
  "utf8",
);

const servicesDir = path.join(__dirname, "services");
const shareDir = "/srv/shared";

const deploy = async () => {
  const { dnsChanged } = await setupCloudflareDDNS(
    ["jellyfin.karkki.org", "immich.karkki.org"],
    "curl ipinfo.io/ip",
  );

  await setupCronjob(
    "cloudflare firewall",
    cloudflareFirewallScript,
    ["443", "192.168.1.0/24", "100.64.0.0/10"],
    {
      deps: ["curl"],
      hour: "2",
      minute: "0",
      immediate: true,
    },
  );
  await setupResticBackup(
    "jellyfin",
    ["~/shared/media/music", "~/services/jellyfin-config"],
    await homelabResticRepo(),
    { hour: "3" },
  );

  const traefik = new TraefikService(path.join(servicesDir, "traefik.yml"));
  await setupServices(
    traefik,
    new Service("jellyfin", path.join(servicesDir, "jellyfin.yml")),
    new Service("immich", path.join(servicesDir, "immich.yml")),
  );

  await setupSambaShare("karkkishare", shareDir);

  await setupCronjob("traefik cloudflare ips", traefikCloudflareIpsScript, [], {
    deps: ["curl"],
    hour: "2",
    minute: "30",
    immediate: true,
  });

  if (dnsChanged) await traefik.refreshCert();
};

export default hostRun(deploy, rpi5_01);
