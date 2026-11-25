import { currentHost, ModuleExecOpts } from "module-runner";
import { currentContext } from "../context.ts";
import { hashCall } from "./canonical.ts";
import { currentStore } from "./store.ts";

type Wrapped<M> = M extends {
  (name: string, args: infer A, opts?: infer O): infer R;
}
  ? (id: string, args: A, opts?: O & { cache?: boolean }) => R
  : never;

type Underlying = (
  id: string,
  args: unknown,
  opts?: ModuleExecOpts,
) => Promise<unknown>;

interface CacheOpts {
  cache?: boolean;
}

const replay = (output: unknown): unknown => ({
  ...(output as object),
  changed: false,
  failed: false,
  skipped: false,
  status: "ok",
});

const persisted = (result: unknown): boolean => {
  const { failed, skipped } = result as { failed?: boolean; skipped?: boolean };
  return !failed && !skipped;
};

const wrapOne =
  (fn: Underlying) =>
  async (
    id: string,
    args: unknown,
    opts?: ModuleExecOpts & CacheOpts,
  ): Promise<unknown> => {
    const { cache, ...forwarded } = opts ?? {};
    const forwardedOpts =
      Object.keys(forwarded).length === 0 ? undefined : forwarded;
    if (
      cache === false ||
      currentContext().cache === false ||
      opts?.check === true
    ) {
      return fn(id, args, forwardedOpts);
    }
    const hash = hashCall(args, forwardedOpts);
    const { hit, output } = await currentStore().run(
      currentHost(),
      id,
      hash,
      () => fn(id, args, forwardedOpts),
      persisted,
    );
    return hit ? replay(output) : output;
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
