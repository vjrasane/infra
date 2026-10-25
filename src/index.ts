import { FilterFn, inventoryRun } from "./lib/inventory";
import rpi5_01 from "./hosts/rpi5-01";
import ocivm_01 from "./hosts/ocivm-a1";
import ocivm_e2 from "./hosts/ocivm-e2";
import { inventory } from "./inventory";

const [, , limit] = process.argv;

const runs = inventoryRun(
  // ------------------
  rpi5_01,
  ocivm_01,
  ocivm_e2,
);

const cond: FilterFn = ({ host, categories }) => {
  if (!limit) return true;
  if (host.name === limit) return true;
  if (categories.includes(limit)) return true;
  return false;
};

const main = async () => {
  await runs(inventory.filter(cond));
};

main();
