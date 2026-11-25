import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test, vi } from "vitest";
import { withContext } from "../context.ts";
import { CacheStore, withStore } from "./store.ts";
import { wrap } from "./wrap.ts";

vi.mock("module-runner", () => {
  const host = { id: Symbol("h1"), name: "h1" };
  return { currentHost: () => host };
});

type Opts = { check?: boolean; cache?: boolean };

const makeBarrel = () => {
  const calls: Array<{ id: string; args: { out?: string } }> = [];
  let failNext = false;
  const demo = async (id: string, args: { out?: string }, _opts?: Opts) => {
    calls.push({ id, args });
    if (failNext) {
      failNext = false;
      throw new Error("boom");
    }
    return {
      status: "ok",
      changed: true,
      failed: false,
      skipped: false,
      out: args?.out,
    };
  };
  return {
    calls,
    failOnce: () => {
      failNext = true;
    },
    barrel: { demo } as Record<string, unknown>,
  };
};

const tempDir = (): Promise<string> =>
  mkdtemp(path.join(tmpdir(), "cache-wrap-"));

const readCache = (dir: string): Promise<string> =>
  readFile(path.join(dir, "cache.json"), "utf8").catch(() => "");

const play = <T>(
  dir: string,
  ctx: { cache?: boolean },
  fn: () => Promise<T>,
): Promise<T> =>
  withStore(new CacheStore(path.join(dir, "cache.json")), () =>
    withContext(ctx, fn),
  );

test("same id + same args runs underlying once", async () => {
  const { barrel, calls } = makeBarrel();
  const w = wrap(barrel) as any;
  const dir = await tempDir();
  await play(dir, {}, async () => {
    await w.demo("task", { out: "a" });
    await w.demo("task", { out: "a" });
  });
  expect(calls).toHaveLength(1);
});

test("same id + different args throws", async () => {
  const { barrel } = makeBarrel();
  const w = wrap(barrel) as any;
  const dir = await tempDir();
  await play(dir, {}, async () => {
    await w.demo("task", { out: "a" });
    await expect(w.demo("task", { out: "b" })).rejects.toThrow(/duplicate id/);
  });
});

test("persisted hash replays output with changed:false", async () => {
  const { barrel, calls } = makeBarrel();
  const w = wrap(barrel) as any;
  const dir = await tempDir();
  await play(dir, {}, () => w.demo("task", { out: "a" }));
  const result: any = await play(dir, {}, () => w.demo("task", { out: "a" }));
  expect(calls).toHaveLength(1);
  expect(result.changed).toBe(false);
  expect(result.out).toBe("a");
});

test("cache:false runs every time and writes nothing", async () => {
  const { barrel, calls } = makeBarrel();
  const w = wrap(barrel) as any;
  const dir = await tempDir();
  await play(dir, {}, async () => {
    await w.demo("task", { out: "a" }, { cache: false });
    await w.demo("task", { out: "a" }, { cache: false });
  });
  expect(calls).toHaveLength(2);
  expect(await readCache(dir)).toBe("");
});

test("cache:false is not forwarded to the underlying module", async () => {
  const seen: unknown[] = [];
  const w = wrap({
    demo: async (_id: string, _args: unknown, opts?: unknown) => {
      seen.push(opts);
      return { status: "ok" };
    },
  }) as any;
  const dir = await tempDir();
  await play(dir, {}, () => w.demo("task", {}, { cache: false, check: false }));
  expect(seen[0]).toEqual({ check: false });
});

test("context cache:false bypasses like per-call cache:false", async () => {
  const { barrel, calls } = makeBarrel();
  const w = wrap(barrel) as any;
  const dir = await tempDir();
  await play(dir, { cache: false }, async () => {
    await w.demo("task", { out: "a" });
    await w.demo("task", { out: "a" });
  });
  expect(calls).toHaveLength(2);
  expect(await readCache(dir)).toBe("");
});

test("check:true reads and writes nothing", async () => {
  const { barrel, calls } = makeBarrel();
  const w = wrap(barrel) as any;
  const dir = await tempDir();
  await play(dir, {}, async () => {
    await w.demo("task", { out: "a" }, { check: true });
    await w.demo("task", { out: "a" }, { check: true });
  });
  expect(calls).toHaveLength(2);
  expect(await readCache(dir)).toBe("");
});

test("failed module is not cached", async () => {
  const { barrel, calls, failOnce } = makeBarrel();
  const w = wrap(barrel) as any;
  const dir = await tempDir();
  await play(dir, {}, async () => {
    failOnce();
    await expect(w.demo("task", { out: "a" })).rejects.toThrow("boom");
  });
  const result: any = await play(dir, {}, () => w.demo("task", { out: "a" }));
  expect(calls).toHaveLength(2);
  expect(result.changed).toBe(true);
});

test("passes id to underlying as the task name", async () => {
  const { barrel, calls } = makeBarrel();
  const w = wrap(barrel) as any;
  const dir = await tempDir();
  await play(dir, {}, () => w.demo("my-task", { out: "a" }));
  expect(calls[0].id).toBe("my-task");
});

test("failed or skipped results are not persisted", async () => {
  let count = 0;
  const w = wrap({
    demo: async () => {
      count++;
      return { status: "failed", failed: true, changed: false, skipped: false };
    },
  }) as any;
  const dir = await tempDir();
  await play(dir, {}, () => w.demo("task", {}));
  const result: any = await play(dir, {}, () => w.demo("task", {}));
  expect(count).toBe(2);
  expect(result.failed).toBe(true);
  expect(await readCache(dir)).toBe("");
});

test("cache:true and no opts dedupe together", async () => {
  const { barrel, calls } = makeBarrel();
  const w = wrap(barrel) as any;
  const dir = await tempDir();
  await play(dir, {}, async () => {
    await w.demo("task", { out: "a" });
    await w.demo("task", { out: "a" }, { cache: true });
  });
  expect(calls).toHaveLength(1);
});
