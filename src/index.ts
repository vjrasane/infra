import { ocivm_01 } from "./hosts/ocivm-a1";
import { rpi5_01 } from "./hosts/rpi5-01";
import { FilterFn } from "./inventory";

const [, , limit] = process.argv;

const runs = [
  // ------------------
  rpi5_01,
  ocivm_01,
];

const cond: FilterFn = ({ host, categories }) => {
  if (!limit) return true;
  if (host.name === limit) return true;
  if (categories.includes(limit)) return true;
  return false;
};

const main = async () => {
  await Promise.all(runs.map((r) => r(cond)));
};

main();
