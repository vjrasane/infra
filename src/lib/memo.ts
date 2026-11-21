import { currentHost } from "module-runner";
import { createHash } from "crypto";
import { mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";
import { currentContext } from "./context";

export class Memo<T> {
  private memo: Map<symbol, Promise<T>> = new Map();

  memoize = (fn: () => Promise<T>): (() => Promise<T>) => {
    return (): Promise<T> => {
      const host = currentHost();
      const memoized = this.memo.get(host.id);
      if (memoized) return memoized;
      const promise = fn();
      this.memo.set(host.id, promise);
      return promise;
    };
  };
}

export type StateInput = {
  plain: Record<string, string | undefined>;
  secret: Record<string, string | undefined>;
};

const STATE_FILE = "state.json";

const hash = (value: string): string =>
  createHash("sha256").update(value).digest("hex");

const equal = (
  a: Record<string, string>,
  b: Record<string, string>,
): boolean => {
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every((k) => a[k] === b[k]);
};

type HostState = Record<string, Record<string, string>>;
type StateData = Record<string, HostState>;

let tmpSeq = 0;

class StateStore {
  private data: StateData = {};
  private loading?: Promise<void>;

  constructor(private readonly file: string) {}

  private load = (): Promise<void> => {
    if (!this.loading) {
      this.loading = readFile(this.file, "utf8")
        .then((raw) => {
          this.data = JSON.parse(raw);
        })
        .catch(() => {
          this.data = {};
        });
    }
    return this.loading;
  };

  get = async (
    host: string,
    key: string,
  ): Promise<Record<string, string> | undefined> => {
    await this.load();
    return this.data[host]?.[key];
  };

  set = async (
    host: string,
    key: string,
    entry: Record<string, string>,
  ): Promise<void> => {
    await this.load();
    (this.data[host] ??= {})[key] = entry;
    await this.flush();
  };

  private flush = async (): Promise<void> => {
    await mkdir(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.${tmpSeq++}.tmp`;
    await writeFile(tmp, JSON.stringify(this.data, null, 2));
    await rename(tmp, this.file);
  };
}

const stores = new Map<string, StateStore>();

const storeFor = (file: string): StateStore => {
  const existing = stores.get(file);
  if (existing) return existing;
  const store = new StateStore(file);
  stores.set(file, store);
  return store;
};

export abstract class StatefulMemo extends Memo<boolean> {
  protected abstract stateKey(): string;
  protected abstract stateInput(): Promise<StateInput>;

  private snapshot = async (): Promise<Record<string, string>> => {
    const { plain, secret } = await this.stateInput();
    const entry: Record<string, string> = {};
    for (const [k, v] of Object.entries(plain)) {
      if (v !== undefined) entry[k] = v;
    }
    for (const [k, v] of Object.entries(secret)) {
      if (v !== undefined) entry[k] = hash(v);
    }
    return entry;
  };

  memoizeState = (fn: () => Promise<boolean>): (() => Promise<boolean>) =>
    this.memoize(async (): Promise<boolean> => {
      const { noState, stateDir } = currentContext();
      if (noState) return fn();

      const host = currentHost();
      const store = storeFor(path.join(stateDir ?? process.cwd(), STATE_FILE));
      const key = this.stateKey();
      const next = await this.snapshot();
      const prev = await store.get(host.name, key);
      if (prev && equal(prev, next)) return false;

      const changed = await fn();
      await store.set(host.name, key, next);
      return changed;
    });
}
