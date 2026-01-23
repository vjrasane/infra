import { App } from "cdk8s";
import { BitwardenSecretsManagerChart } from "./charts/bitwarden";
import { createClient, applyManifests, KubernetesManifest } from "./lib/apply";

async function main() {
  const app = new App();
  const chart = new BitwardenSecretsManagerChart(app, "bitwarden");

  const manifests = chart.toJson() as KubernetesManifest[];

  console.log(`Found ${manifests.length} manifests to apply`);

  const client = createClient();
  await applyManifests(client, manifests);

  console.log("Done!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
