import { host, HostRef, SSHConfig } from "@sensible-ts/core";

interface InventoryHost {
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

type HostRunFn = (filter: FilterFn) => Promise<void>;

export const hostRun = (
  fn: () => Promise<void>,
  ihost: InventoryHost,
): HostRunFn => {
  return async (filter: FilterFn) => {
    if (!filter(ihost)) return;
    return ihost.host.run(fn);
  };
};
