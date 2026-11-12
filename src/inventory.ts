// import { Inventory, inventoryHost } from "./lib/inventory";

import { Group, Host } from "./lib/inventory";

export const rpi5_01 = new Host("rpi5-01", { user: "vjrasane" });
export const ocivm_01 = new Host("ocivm-01");
export const ocivm_e2 = new Host("ocivm-02");

export const all = new Group([rpi5_01, ocivm_01, ocivm_e2]);
