import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { currentContext } from "../context.ts";

export type CacheEntry = { hash: string; output: unknown };

type CacheData = Record<string, Record<string, CacheEntry>>;

const CACHE_FILE = "cache.json";

let tmpSeq = 0;

export class CacheStore {
  private data: CacheData = {};
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

  get = async (host: string, id: string): Promise<CacheEntry | undefined> => {
    await this.load();
    return this.data[host]?.[id];
  };

  set = async (host: string, id: string, entry: CacheEntry): Promise<void> => {
    await this.load();
    (this.data[host] ??= {})[id] = entry;
    await this.flush();
  };

  private flush = async (): Promise<void> => {
    await mkdir(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.${tmpSeq++}.tmp`;
    await writeFile(tmp, JSON.stringify(this.data, null, 2));
    await rename(tmp, this.file);
  };
}

const stores = new Map<string, CacheStore>();

export const cacheStore = (): CacheStore => {
  const { cacheDir } = currentContext();
  const file = path.join(cacheDir ?? process.cwd(), CACHE_FILE);
  const existing = stores.get(file);
  if (existing) return existing;
  const store = new CacheStore(file);
  stores.set(file, store);
  return store;
};
