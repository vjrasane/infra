import { docker_prune } from "../../community/docker";
import { readFileSync } from "node:fs";
import path from "path";
import { setupCloudflareDDNS } from "../../lib/cloudflare-ddns";
import { setupCronjob } from "../../lib/cronjob";
import { setupResticBackup } from "../../lib/restic-backup";
import { decryptSops } from "sops-age";
import { refreshTraefikCert, setupServices } from "../../lib/services";
import { hostRun } from "../../lib/inventory";
import { rpi5_01 } from "../../inventory";

const cloudflareFirewallScript = readFileSync(
  path.join(__dirname, "set-cloudflare-firewall.sh"),
  "utf8",
);

const traefikCloudflareIpsScript = readFileSync(
  path.join(__dirname, "set-traefik-cloudflare-ips.sh"),
  "utf8",
);

const servicesDir = path.join(__dirname, "services");
const composeFiles = [
  path.join(servicesDir, "docker-compose.yml"),
  path.join(servicesDir, "immich.yml"),
  path.join(servicesDir, "jellyfin.yml"),
  path.join(servicesDir, "traefik.yml"),
];

const deploy = async () => {
  const secrets: Record<string, string> = await decryptSops({
    path: path.join(__dirname, "secrets.env"),
  });

  const { dnsChanged } = await setupCloudflareDDNS(
    "jellyfin.karkki.org",
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
    { env: secrets, hour: "3" },
  );

  await setupServices(composeFiles, ["jellyfin", "immich", "traefik"], secrets);

  await setupCronjob("traefik cloudflare ips", traefikCloudflareIpsScript, [], {
    deps: ["curl"],
    hour: "2",
    minute: "30",
    immediate: true,
  });

  if (dnsChanged) await refreshTraefikCert();

  await docker_prune("Prune dangling images", {
    images: true,
    images_filters: {
      dangling: true,
    },
  });
};

export default hostRun(deploy, rpi5_01);
