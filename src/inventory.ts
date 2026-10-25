import { inventoryHost } from "./lib/inventory";

export const rpi5_01 = inventoryHost("rpi5-01", { user: "vjrasane" });
export const ocivm_01 = inventoryHost("ocivm-01");
export const ocivm_e2 = inventoryHost("ocivm-02");

export const inventory = [rpi5_01, ocivm_01, ocivm_e2];
