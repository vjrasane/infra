import { AsyncLocalStorage } from "async_hooks";
import { Target } from "./inventory";
import { currentHost } from "module-runner";

type Context = {
  filter: (target: Target) => boolean;
  handlers: Array<() => Promise<unknown>>;
  tags: string[];
};

const storage = new AsyncLocalStorage<Context>();

const defaultContext: Context = { filter: () => true, tags: [], handlers: [] };

export function currentContext(): Context {
  const ctx = storage.getStore();
  if (ctx) return ctx;
  return defaultContext;
}

export function registerHandler(fn: () => Promise<unknown>) {
  const ctx = currentContext();
  const host = currentHost();
  ctx.handlers.push(() => withContext({ tags: [] }, () => host.run(fn)));
}

export function handlers(): Array<() => Promise<unknown>> {
  return currentContext().handlers;
}

export function withContext<T>(
  ctx: Partial<Context>,
  fn: () => Promise<T>,
): Promise<T> {
  const p = currentContext();
  return storage.run({ ...p, ...ctx }, fn);
}
