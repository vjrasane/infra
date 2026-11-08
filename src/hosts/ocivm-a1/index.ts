import { readFileSync } from "fs";
import path from "path";
import { setupCloudflareDDNS } from "../../lib/cloudflare-ddns";
import { setupCronjob } from "../../lib/cronjob";
import { setupResticBackup } from "../../lib/restic-backup";
import { file } from "module-runner/builtin";
import { facts } from "module-runner";
import { Service, setupServices, TraefikService } from "../../lib/services";
import { hostRun } from "../../lib/inventory";
import { ocivm_01 } from "../../inventory";
import { paperlessResticRepo } from "../../restic";

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

const servicesDir = path.join(__dirname, "services");

const deploy = async () => {
  const { dnsChanged } = await setupCloudflareDDNS(
    ["paperless.karkki.org"],
    "tailscale ip -4",
    false,
  );
  await setupCronjob("paperless export", paperlessExportScript, [], {
    hour: "2",
    minute: "30",
  });
  await setupResticBackup(
    "paperless",
    [exportDir],
    await paperlessResticRepo(),
    {
      hour: "3",
    },
  );

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

  const traefik = new TraefikService(path.join(servicesDir, "traefik.yml"));
  await setupServices(
    traefik,
    new Service("paperless", path.join(servicesDir, "paperless.yml"), {
      services: ["paperless", "redis"],
    }),
  );

  if (dnsChanged) await traefik.refreshCert();
};

export default hostRun(deploy, ocivm_01);
