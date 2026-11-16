import { Group, Host } from "./lib/inventory";

export const rpi5_01 = new Host("rpi5-01", { user: "vjrasane" });
export const ocivm_a1 = new Host("ocivm-a1");
export const ocivm_e2 = new Host("ocivm-e2");

export const all = new Group([rpi5_01, ocivm_a1, ocivm_e2]);
