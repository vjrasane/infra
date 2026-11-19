import {
  docker_container,
  docker_volume,
  docker_compose_v2,
} from "../community/docker";
import { task } from "../lib/task";
import composeFileContent from "./traefik.yml";
import { cloudflareSecrets } from "../cloudflare-ddns";
import { dir, commonPerms as perms } from "../lib/files";
import { toEnvFile } from "../lib/utils";
import { startService } from "../lib/services";
import setCloudflareIpsScriptContent from "./set-traefik-cloudflare-ips.sh";
import setCloudflareFirewallScriptContent from "./set-cloudflare-firewall.sh";
import { setupCronjob } from "../lib/cronjob";
import { shell } from "module-runner/builtin";

const serviceDir = dir("/opt/traefik", perms);

const composeFile = serviceDir.file("compose.yaml", composeFileContent, perms);
const secretsFile = serviceDir.file(
  ".env",
  cloudflareSecrets().then(toEnvFile),
  { ...perms, mode: "0600" },
);
const setCloudflareIpsScript = serviceDir.file(
  "set-traefik-cloudflare-ips.sh",
  setCloudflareIpsScriptContent,
  perms,
);

const setCloudflareFirewallScript = serviceDir.file(
  "set-cloudflare-firewall.sh",
  setCloudflareFirewallScriptContent,
  perms,
);

export const traefik = task(["docker", "traefik"], async () => {
  await composeFile.create();
  await secretsFile.create();
  await startService("traefik", composeFile.dirPath, {
    networks: ["traefik"],
  });
});

const tailnetIp4 = "100.64.0.0/10";
const tailnetIp6 = "fd7a:115c:a1e0::/48";
const extraIps = [
  "127.0.0.1/32",
  "172.16.0.0/12",
  "10.0.0.0/8",
  "192.168.0.0/16",
  tailnetIp4,
  tailnetIp6,
];

const setCloudflareIpsCmd = `${setCloudflareIpsScript.path} ${composeFile.dirPath} ${extraIps.join(" ")}`;
const setCloudflareIps = task([], async () => {
  await setCloudflareIpsScript.create();
  await shell("Set cloudflare IPs", { cmd: setCloudflareIpsCmd });
});

export const setCloudflareIpsCronjob = task([], async () => {
  await setCloudflareIpsScript.create();
  await setupCronjob("set cloudflare ips", setCloudflareIpsCmd, {
    minute: "0",
    hour: "5",
  }).then(setCloudflareIps.register);
});

const setCloudflareFirewallCmd = `${setCloudflareFirewallScript.path} eth0 443 ${extraIps.join(" ")}`;
const setCloudflareFirewall = task([], async () => {
  await setCloudflareFirewallScript.create();
  await shell("Set cloudflare firewall", { cmd: setCloudflareFirewallCmd });
});

export const setCloudflareFirewallCronjob = task([], async () => {
  await setCloudflareFirewallScript.create();
  await setupCronjob("set cloudflare firewall", setCloudflareFirewallCmd, {
    minute: "0",
    hour: "5",
  }).then(setCloudflareFirewall.register);
});

export const filterTraffic = task([], async () => {
  await setCloudflareFirewallCronjob();
  await setCloudflareIpsCronjob();
});

export const refreshTraefikCert = task([], async () => {
  await docker_container("Remove traefik container after DNS update", {
    name: "traefik",
    state: "absent",
  });

  await docker_volume("Remove traefik letsencrypt volume", {
    volume_name: "traefik-letsencrypt",
    state: "absent",
  });

  await docker_compose_v2("Recreate traefik after DNS update", {
    services: "traefik",
    project_src: serviceDir.path,
    pull: "missing",
  });
});
