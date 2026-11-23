import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test } from "vitest";
import { withContext } from "../context.ts";
import { cacheStore } from "./store.ts";

const tempDir = (): Promise<string> =>
  mkdtemp(path.join(tmpdir(), "cache-store-"));

test("round-trips an entry", async () => {
  const cacheDir = await tempDir();
  await withContext({ cacheDir }, async () => {
    await cacheStore().set("host", "id", { hash: "h", output: { a: 1 } });
    expect(await cacheStore().get("host", "id")).toEqual({
      hash: "h",
      output: { a: 1 },
    });
  });
});

test("missing file reads as empty", async () => {
  const cacheDir = await tempDir();
  await withContext({ cacheDir }, async () => {
    expect(await cacheStore().get("host", "id")).toBeUndefined();
  });
});

test("corrupt json reads as empty", async () => {
  const cacheDir = await tempDir();
  await writeFile(path.join(cacheDir, "cache.json"), "{");
  await withContext({ cacheDir }, async () => {
    expect(await cacheStore().get("host", "id")).toBeUndefined();
  });
});
