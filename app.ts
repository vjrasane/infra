import { App, Size } from "cdk8s";
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

const app = new App();

new BitwardenSecretsManagerChart(app, "bitwarden");
new MetalLBChart(app, "metallb", {
  addresses: ["192.168.1.200-192.168.1.230"],
});
const storageClassName = "local-path";
new LocalPathProvisionerChart(app, "local-path-provisioner", {
  storageClassName,
  nodePathMap: [
    {
      node: "DEFAULT_PATH_FOR_NON_LISTED_NODES",
      paths: ["/var/lib/rancher/k3s/storage"],
    },
    { node: "ridge", paths: ["/mnt/ssd1", "/mnt/ssd2"] },
  ],
});
new TraefikChart(app, "traefik", {
  nodes: ["ridge"],
});

const clusterIssuerName = "cloudflare-issuer";
new CertManagerChart(app, "cert-manager", {
  clusterIssuerName,
});
new HeadlampChart(app, "headlamp", {
  hosts: ["headlamp.home.karkki.org"],
  clusterIssuerName,
});
new TraefikDashboardChart(app, "traefik-dashboard", {
  hosts: ["traefik.home.karkki.org"],
  clusterIssuerName,
});
new HomepageChart(app, "homepage", {
  hosts: ["home.karkki.org"],
  clusterIssuerName,
});
const postgresChart = new PostgresChart(app, "postgres", {
  hosts: ["pgadmin.home.karkki.org"],
  clusterIssuerName,
  storageClassName,
  storageSize: Size.gibibytes(10),
});
new AuthentikChart(app, "authentik", {
  hosts: ["auth.home.karkki.org"],
  clusterIssuerName,
  postgresHost: postgresChart.serviceHost,
});
new PlankaChart(app, "planka", {
  hosts: ["planka.home.karkki.org"],
  clusterIssuerName,
  storageClassName,
});
new CloudflareDdnsChart(app, "cloudflare-ddns");

export default app;
