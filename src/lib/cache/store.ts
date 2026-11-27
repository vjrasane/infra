import { AsyncLocalStorage } from "async_hooks";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { currentContext } from "../context.ts";
import { HostRef, ModuleResult } from "module-runner";

export type CacheHit<TOut> = { hit: boolean; result: ModuleResult<TOut> };

type CacheData = Record<string, Record<string, ModuleResult<unknown>>>;

type Inflight<TOut> = Promise<CacheHit<TOut>>;

const CACHE_FILE = "cache.json";

let tmpSeq = 0;

export class CacheStore {
  private data: CacheData = {};
  private loading?: Promise<CacheData>;
  private flushing: Promise<void> = Promise.resolve();
  private inflight = new Map<symbol, Map<string, Inflight<unknown>>>();

  constructor(private readonly file: string) {}

  private load = (): Promise<CacheData> => {
    if (!this.loading) {
      this.loading = this.loadFile();
    }
    return this.loading;
  };

  private loadFile = async () => {
    try {
      const raw = await readFile(this.file, "utf8");
      this.data = JSON.parse(raw);
    } catch (error) {
      this.data = {};
    }
    return this.data;
  };

  get = async (
    host: string,
    id: string,
  ): Promise<ModuleResult<unknown> | undefined> => {
    const data = await this.load();
    return data[host]?.[id];
  };

  set = async (
    host: string,
    id: string,
    entry: ModuleResult<any>,
  ): Promise<void> => {
    await this.load();
    (this.data[host] ??= {})[id] = entry;
    await this.flush();
  };

  private flush = (): Promise<void> => {
    this.flushing = this.flushing
      .catch(() => {})
      .then(async () => {
        await mkdir(path.dirname(this.file), { recursive: true });
        const tmp = `${this.file}.${process.pid}.${tmpSeq++}.tmp`;
        await writeFile(tmp, JSON.stringify(this.data, null, 2));
        await rename(tmp, this.file);
      });
    return this.flushing;
  };

  private getHostRuns = (host: HostRef): Map<string, Inflight<unknown>> => {
    if (!this.inflight.has(host.id)) {
      this.inflight.set(host.id, new Map<string, Inflight<unknown>>());
    }
    return this.inflight.get(host.id)!;
  };

  private getInflight = (
    host: HostRef,
    resourceId: string,
  ): Inflight<unknown> | undefined => {
    return this.getHostRuns(host).get(resourceId);
  };

  private setInflight = (
    host: HostRef,
    resourceId: string,
    inflight: Inflight<any>,
  ): void => {
    this.getHostRuns(host).set(resourceId, inflight);
  };

  run = <TOut>(
    host: HostRef,
    hash: string,
    compute: () => Promise<ModuleResult<TOut>>,
  ): Promise<CacheHit<TOut>> => {
    const inflight = this.getInflight(host, hash);
    if (!inflight) {
      const promise = this.resolve(host.name, hash, compute);
      this.setInflight(host, hash, promise);
      return promise;
    }
    return inflight;
  };

  private resolve = async <TOut>(
    host: string,
    hash: string,
    compute: () => Promise<ModuleResult<TOut>>,
  ): Promise<CacheHit<TOut>> => {
    const stored = await this.get(host, hash);
    if (stored) {
      return { hit: true, result: stored };
    }
    const result = await compute();
    if (!result.failed && !result.skipped) {
      await this.set(host, hash, { hash, output: result });
    }
    return { hit: false, result };
  };
}

const storage = new AsyncLocalStorage<CacheStore>();

let fallback: { file: string; store: CacheStore } | undefined;

const defaultStore = (): CacheStore => {
  const { cacheDir } = currentContext();
  const file = path.join(cacheDir ?? process.cwd(), CACHE_FILE);
  if (fallback?.file !== file) {
    fallback = { file, store: new CacheStore(file) };
  }
  return fallback.store;
};

export const currentStore = (): CacheStore =>
  storage.getStore() ?? defaultStore();

export const withStore = <T>(
  store: CacheStore,
  fn: () => Promise<T>,
): Promise<T> => storage.run(store, fn);
