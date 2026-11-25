import {
  currentHost,
  ModuleFn,
  ModuleExecOpts,
  ModuleResult,
} from "module-runner";
import { currentContext } from "../context.ts";
import { hashCall } from "./canonical.ts";
import { currentStore } from "./store.ts";

type Wrapped<M> = M extends {
  (name: string, args: infer A, opts?: infer O): infer R;
}
  ? (id: string, args: A, opts?: O & { cache?: boolean }) => R
  : never;

// interface Underlying<TArgs, TOut> {
//  (args: TArgs, opts?: ModuleExecOpts): Promise<ModuleResult<TOut>>
//  (name: string, args:  TArgs, opts?: ModuleExecOpts): Promise<ModuleResult<TOut>>
// }
//
// const inRun = new Map<
//   symbol,
//   Map<string, { hash: string; promise: Promise<unknown> }>
// >();
//
// export const __resetInRun = (): void => {
//   inRun.clear();
// };

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
  const stored = await currentStore().get(host, id);
  if (stored?.hash === hash) return replay(stored.output);
  const result = await fn(id, args, opts);
  const { failed, skipped } = result as { failed?: boolean; skipped?: boolean };
  if (!failed && !skipped) {
    await currentStore().set(host, id, { hash, output: result });
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

interface CacheOpts {
  cache?: boolean;
}

type WrappedModuleOpts = ModuleExecOpts & CacheOpts;

class WrappedModule<TArgs, TOut> {
  constructor(private readonly moduleFn: ModuleFn<TArgs, TOut>) {}

  run = async (
    id: string,
    args: TArgs,
    opts: WrappedModuleOpts = {},
  ): Promise<ModuleResult<TOut>> => {
    const { cache, ...forwarded } = opts;
    if (!this.isCacheEnabled(cache)) {
      return this.moduleFn(id, args, forwarded);
    }

    const hash = hashCall(args, opts);
    const host = currentHost();
    const result = await currentStore().run(host, id, hash, () =>
      this.moduleFn(id, args, opts),
    );
    return result.output;
  };
  //
  // private getCached(args: TArgs, opts: ModuleExecOpts) {
  //   const host = currentHost();
  //   const hash = hashCall(args, opts);
  //   const hostRuns = inRun.get(host.id) ?? new Map();
  //   inRun.set(host.id, hostRuns);
  //   const existing = hostRuns.get(id);
  //   if (existing) {
  //     if (existing.hash !== hash) {
  //       throw new Error(
  //         `duplicate id "${id}" on host "${host.name}" with different arguments`,
  //       );
  //     }
  //     return existing.promise;
  //   }
  //   const promise = runPersisted(fn, host.name, id, hash, args, forwardedOpts);
  //   hostRuns.set(id, { hash, promise });
  //   return promise;
  // }

  private isCacheEnabled(cached?: boolean) {
    if (cached === false) return false;
    if (currentContext().cache === false) return false;
    return true;
  }
}

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
