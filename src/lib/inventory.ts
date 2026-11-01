import { host, HostRef, SSHConfig } from "module-runner";

export interface InventoryHost {
  host: HostRef;
  categories: string[];
}

export const inventoryHost = (
  name: string,
  cfg?: Partial<SSHConfig>,
  ...categories: string[]
): InventoryHost => {
  const _host = host(name, cfg);
  return {
    host: _host,
    categories,
  };
};

export type FilterFn = (host: InventoryHost) => boolean;

type HostRunFn = (host: InventoryHost) => Promise<void>;

const toFilterFn =
  (filter: Array<FilterFn | string | InventoryHost>): FilterFn =>
  (ihost) =>
    filter.some((f) => {
      if (typeof f === "function") return f(ihost);
      if (typeof f !== "string") return ihost.host.id === f.host.id;
      if (ihost.categories.includes(f)) return true;
      if (ihost.host.name === f) return true;
      return false;
    });

export const hostRun = (
  runFn: () => Promise<void>,
  ...filter: Array<FilterFn | string | InventoryHost>
): HostRunFn => {
  const filterFn = toFilterFn(filter);
  return (ihost) =>
    filterFn(ihost) ? ihost.host.run(runFn) : Promise.resolve();
};

export const inventoryRun =
  (...runs: HostRunFn[]) =>
  (inventory: InventoryHost[]) =>
    Promise.all(
      inventory.map(async (ihost) => {
        for (const runFn of runs) {
          await runFn(ihost);
        }
      }),
    );
