import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, test } from "vitest";
import { withContext } from "../context.ts";
import { currentStore } from "./store.ts";

const dirs: string[] = [];

const tempDir = async (): Promise<string> => {
  const dir = await mkdtemp(path.join(tmpdir(), "cache-store-"));
  dirs.push(dir);
  return dir;
};

afterEach(async () => {
  await Promise.all(
    dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

test("round-trips an entry", async () => {
  const cacheDir = await tempDir();
  await withContext({ cacheDir }, async () => {
    await currentStore().set("host", "id", { hash: "h", output: { a: 1 } });
    expect(await currentStore().get("host", "id")).toEqual({
      hash: "h",
      output: { a: 1 },
    });
  });
});

test("persists an entry to disk", async () => {
  const cacheDir = await tempDir();
  const entry = { hash: "h", output: { a: 1 } };
  await withContext({ cacheDir }, async () => {
    await currentStore().set("host", "id", entry);
  });
  const raw = await readFile(path.join(cacheDir, "cache.json"), "utf8");
  expect(JSON.parse(raw)).toEqual({ host: { id: entry } });
});

test("missing file reads as empty", async () => {
  const cacheDir = await tempDir();
  await withContext({ cacheDir }, async () => {
    expect(await currentStore().get("host", "id")).toBeUndefined();
  });
});

test("corrupt json reads as empty", async () => {
  const cacheDir = await tempDir();
  await writeFile(path.join(cacheDir, "cache.json"), "{");
  await withContext({ cacheDir }, async () => {
    expect(await currentStore().get("host", "id")).toBeUndefined();
  });
});
