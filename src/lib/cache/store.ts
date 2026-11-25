import { AsyncLocalStorage } from "async_hooks";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { currentContext } from "../context.ts";
import { HostRef, ModuleResult } from "module-runner";

export type CacheEntry = { hash: string; output: unknown };

export type CacheHit = { hit: boolean; output: unknown };

type CacheData = Record<string, Record<string, CacheEntry>>;

type Inflight = { hash: string; promise: Promise<CacheHit> };

const CACHE_FILE = "cache.json";

let tmpSeq = 0;

export class CacheStore {
  private data: CacheData = {};
  private loading?: Promise<CacheData>;
  private flushing: Promise<void> = Promise.resolve();
  private inflight = new Map<symbol, Map<string, Inflight>>();

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

  get = async (host: string, id: string): Promise<CacheEntry | undefined> => {
    const data = await this.load();
    return data[host]?.[id];
  };

  set = async (host: string, id: string, entry: CacheEntry): Promise<void> => {
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

  private getHostRuns = (host: HostRef): Map<string, Inflight> => {
    if (!this.inflight.has(host.id)) {
      this.inflight.set(host.id, new Map<string, Inflight>());
    }
    return this.inflight.get(host.id)!;
  };

  private getInflight = (
    host: HostRef,
    resourceId: string,
  ): Inflight | undefined => {
    return this.getHostRuns(host).get(resourceId);
  };

  private setInflight = (
    host: HostRef,
    resourceId: string,
    inflight: Inflight,
  ): void => {
    this.getHostRuns(host).set(resourceId, inflight);
  };

  run = (
    host: HostRef,
    id: string,
    hash: string,
    compute: () => Promise<ModuleResult<unknown>>,
    // persist: (result: unknown) => boolean,
  ): Promise<CacheHit> => {
    const inflight = this.getInflight(host, id);
    if (!inflight) {
      const promise = this.resolve(host.name, id, hash, compute);
      this.setInflight(host, id, { hash, promise });
      return promise;
    }
    if (inflight.hash !== hash) {
      throw new Error(
        `duplicate id "${id}" on host "${host.name}" with different arguments`,
      );
    }
    return inflight.promise;
  };

  private resolve = async (
    host: string,
    id: string,
    hash: string,
    compute: () => Promise<ModuleResult<unknown>>,
  ): Promise<CacheHit> => {
    const stored = await this.get(host, id);
    if (stored?.hash === hash) return { hit: true, output: stored.output };
    const result = await compute();
    if (!result.failed && !result.skipped) {
      await this.set(host, id, { hash, output: result });
    }
    return { hit: false, output: result };
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
