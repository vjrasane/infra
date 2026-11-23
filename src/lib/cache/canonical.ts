import { createHash } from "node:crypto";

const normalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(normalize);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => [k, normalize(v)]),
    );
  }
  return value;
};

export const canonical = (value: unknown): string =>
  JSON.stringify(normalize(value));

export const hashCall = (args: unknown, opts: unknown): string =>
  createHash("sha256").update(canonical({ args, opts })).digest("hex");
