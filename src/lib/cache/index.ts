import * as rawBuiltin from "module-runner/builtin";
import { wrap } from "./wrap.ts";

export const builtin = wrap(rawBuiltin);

export { wrap } from "./wrap.ts";
export { cacheStore } from "./store.ts";
export type { CacheEntry } from "./store.ts";
