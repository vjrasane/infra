import { currentHost } from "module-runner";
import { currentContext } from "../context.ts";
import { hashCall } from "./canonical.ts";
import { cacheStore } from "./store.ts";

type CacheOpts = { cache?: boolean; check?: boolean };

type Wrapped<M> = M extends {
  (name: string, args: infer A, opts?: infer O): infer R;
}
  ? (id: string, args: A, opts?: O & { cache?: boolean }) => R
  : never;

type Underlying = (
  id: string,
  args: unknown,
  opts?: unknown,
) => Promise<unknown>;

const inRun = new Map<
  symbol,
  Map<string, { hash: string; promise: Promise<unknown> }>
>();

export const __resetInRun = (): void => {
  inRun.clear();
};

const replay = (output: unknown): unknown => ({
  ...(output as object),
  changed: false,
  failed: false,
  skipped: false,
  status: "ok",
});

const runPersisted = async (
  fn: Underlying,
  host: string,
  id: string,
  hash: string,
  args: unknown,
  opts: unknown,
): Promise<unknown> => {
  const stored = await cacheStore().get(host, id);
  if (stored?.hash === hash) return replay(stored.output);
  const result = await fn(id, args, opts);
  const { failed, skipped } = result as { failed?: boolean; skipped?: boolean };
  if (!failed && !skipped) {
    await cacheStore().set(host, id, { hash, output: result });
  }
  return result;
};

const wrapOne =
  (fn: Underlying) =>
  async (id: string, args: unknown, opts?: CacheOpts): Promise<unknown> => {
    const { cache, ...forwarded } = opts ?? {};
    const forwardedOpts =
      Object.keys(forwarded).length === 0 ? undefined : forwarded;
    if (cache === false || currentContext().noCache || opts?.check === true) {
      return fn(id, args, forwardedOpts);
    }
    const host = currentHost();
    const hash = hashCall(args, forwardedOpts);
    const hostRuns = inRun.get(host.id) ?? new Map();
    inRun.set(host.id, hostRuns);
    const existing = hostRuns.get(id);
    if (existing) {
      if (existing.hash !== hash) {
        throw new Error(
          `duplicate id "${id}" on host "${host.name}" with different arguments`,
        );
      }
      return existing.promise;
    }
    const promise = runPersisted(fn, host.name, id, hash, args, forwardedOpts);
    hostRuns.set(id, { hash, promise });
    return promise;
  };

export function wrap<B extends Record<string, unknown>>(
  barrel: B,
): { [K in keyof B]: Wrapped<B[K]> } {
  return Object.fromEntries(
    Object.entries(barrel).map(([key, value]) => [
      key,
      typeof value === "function" ? wrapOne(value as Underlying) : value,
    ]),
  ) as { [K in keyof B]: Wrapped<B[K]> };
}
