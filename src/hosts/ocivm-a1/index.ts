import { readFileSync } from "fs";
import path from "path";
import { decryptSops } from "sops-age";
import { setupCloudflareDDNS } from "../../lib/cloudflare-ddns";
import { setupCronjob } from "../../lib/cronjob";
import { setupResticBackup } from "../../lib/restic-backup";
import { file } from "@sensible-ts/core/builtin";
import { facts } from "@sensible-ts/core";
import { refreshTraefikCert, setupServices } from "../../lib/services";
import { hostRun } from "../../lib/inventory";
import { ocivm_01 } from "../../inventory";

const paperlessExportScript = readFileSync(
  path.join(__dirname, "paperless-export.sh"),
  "utf8",
);

const exportDir = "/mnmt/data/paperless/export";
const dataDirs = [
  "/mnt/data/paperless/data",
  "/mnt/data/paperless/media",
  "/mnt/data/paperless/consume",
  exportDir,
];

const deploy = async () => {
  const secrets: Record<string, string> = await decryptSops({
    path: path.join(__dirname, "secrets.env"),
  });

  const { dnsChanged } = await setupCloudflareDDNS(
    "paperless.karkki.org",
    "tailscale ip -4",
  );
  await setupCronjob("paperless export", paperlessExportScript, [], {
    hour: "2",
    minute: "30",
  });
  await setupResticBackup("paperless", [exportDir], {
    env: secrets,
    hour: "3",
  });

  const { ansible_user_id } = await facts();
  for (const d of dataDirs) {
    await file(`Create directory ${d}`, {
      path: d,
      state: "directory",
      owner: ansible_user_id,
      group: ansible_user_id,
      recurse: true,
    });
  }

  await setupServices(
    path.join(__dirname, "docker-compose.yml"),
    ["paperless", "redis", "traefik"],
    secrets,
  );

  if (dnsChanged) await refreshTraefikCert();
};

export default hostRun(deploy, ocivm_01);
