import { App, Size } from "cdk8s";
import {
  hostnameIn,
  hostnameNotIn,
  requiredNodeAffinity,
} from "./lib/affinity";
import {
  allSubdomains,
  cloudSubdomain,
  homeDomain,
  homeSubdomain,
} from "./lib/hosts";
import { BitwardenSecretsManagerChart } from "./charts/bitwarden";
import { HeadlampChart } from "./charts/headlamp";
import { MetalLBChart } from "./charts/metallb";
import { LocalPathProvisionerChart } from "./charts/local-path-provisioner";
import { TraefikChart } from "./charts/traefik";
import { TraefikDashboardChart } from "./charts/traefik-dashboard";
import { CertManagerChart } from "./charts/cert-manager";
import { HomepageChart } from "./charts/homepage";
import { PostgresChart } from "./charts/postgres";
import { AuthentikChart } from "./charts/authentik";
import { PlankaChart } from "./charts/planka";
import { CloudflareDdnsChart } from "./charts/cloudflare-ddns";
import { SambaChart } from "./charts/samba";
import { JellyfinChart } from "./charts/jellyfin";
import { KubePrometheusStackChart } from "./charts/kube-prometheus-stack";
import { VectorChart } from "./charts/vector";
import { LokiChart } from "./charts/loki";
import { CrowdSecChart } from "./charts/crowdsec";
import { HAProxyChart } from "./charts/haproxy";

const app = new App();

const resticRepository =
  "s3:s3.eu-central-003.backblazeb2.com/karkkinet-restic-repo";
const psqlResticRepository =
  "s3:485029190166e70f3358ab9fc87c6b4f.r2.cloudflarestorage.com/karkkinet-psql-backups";

new BitwardenSecretsManagerChart(app, "bitwarden");
new MetalLBChart(app, "metallb", {
  addresses: ["192.168.1.200-192.168.1.230"],
  nodeAffinity: requiredNodeAffinity(hostnameIn("ridge")),
});
const storageClassName = "local-path";
new LocalPathProvisionerChart(app, "local-path-provisioner", {
  storageClassName,
  affinity: requiredNodeAffinity(hostnameNotIn("ridge")),
  nodePathMap: [
    {
      node: "DEFAULT_PATH_FOR_NON_LISTED_NODES",
      paths: ["/mnt/block1"],
    },
    { node: "ridge", paths: [] },
    { node: "vaio", paths: ["/var/lib/rancher/k3s/storage"] },
  ],
});
new CrowdSecChart(app, "crowdsec");
new HAProxyChart(app, "haproxy", {
  traefikServiceHost: "traefik.traefik.svc.cluster.local",
  nodeAffinity: requiredNodeAffinity(hostnameNotIn("vaio", "ridge")),
});
new TraefikChart(app, "traefik", {
  crowdsecBouncerEnabled: true,
});

const clusterIssuerName = "cloudflare-issuer";
new CertManagerChart(app, "cert-manager", {
  clusterIssuerName,
});
new HeadlampChart(app, "headlamp", {
  hosts: [homeSubdomain("headlamp")],
  clusterIssuerName,
});
new TraefikDashboardChart(app, "traefik-dashboard", {
  hosts: [homeSubdomain("traefik")],
  clusterIssuerName,
});
new HomepageChart(app, "homepage", {
  hosts: [homeDomain],
  clusterIssuerName,
});
const postgresChart = new PostgresChart(app, "postgres", {
  hosts: [homeSubdomain("pgadmin")],
  clusterIssuerName,
  resticRepository: psqlResticRepository,
  storageClassName,
});
new AuthentikChart(app, "authentik", {
  hosts: allSubdomains("auth"),
  clusterIssuerName,
  postgresHost: postgresChart.serviceHost,
});
new PlankaChart(app, "planka", {
  hosts: allSubdomains("planka"),
  clusterIssuerName,
  nodeName: "ridge",
  dataPath: "/mnt/ssd1/planka",
});
new CloudflareDdnsChart(app, "cloudflare-ddns", {
  nodeName: "ridge",
});
new SambaChart(app, "samba", {
  storageSize: Size.tebibytes(1),
  storagePath: "/mnt/ssd2/samba",
  nodeName: "ridge",
  resticRepository,
});
new JellyfinChart(app, "jellyfin", {
  hosts: allSubdomains("jellyfin"),
  clusterIssuerName,
  nodeName: "ridge",
  configPath: "/mnt/ssd1/jellyfin",
  mediaPath: "/mnt/ssd2/samba/music",
  resticRepository,
});
new KubePrometheusStackChart(app, "kube-prometheus-stack", {
  grafanaHosts: allSubdomains("grafana"),
  grafanaRootUrl: `https://${cloudSubdomain("grafana")}`,
  prometheusHosts: [homeSubdomain("prometheus")],
  alertmanagerHosts: [homeSubdomain("alertmanager")],
  clusterIssuerName,
  nodeAffinity: requiredNodeAffinity(hostnameNotIn("vaio", "ridge")),
  prometheusNodeAffinity: requiredNodeAffinity(hostnameIn("vaio")),
});
const lokiChart = new LokiChart(app, "loki", {
  nodeAffinity: requiredNodeAffinity(hostnameIn("vaio")),
});
new VectorChart(app, "vector", {
  hosts: allSubdomains("vector"),
  clusterIssuerName,
  nodeAffinity: requiredNodeAffinity(hostnameIn("vaio")),
  lokiPushUrl: lokiChart.pushUrl,
});

export default app;
