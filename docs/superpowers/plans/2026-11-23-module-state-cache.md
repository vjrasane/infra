# Module state cache Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace per-resource `StatefulMemo` with a centralized, module-level IaC-style state cache that skips an Ansible-module call whose id + args/opts hash was already recorded for the host.

**Architecture:** A `wrap(barrel)` utility maps a collection barrel of `ModuleFn`s to memoizing functions that take a required id as the first argument, hash the full args+opts (key-order-stable), and read/write one `cache.json` per host via `CacheStore`. On a hit the stored output is replayed (`changed:false`); `files.ts` migrates off `StatefulMemo` onto the wrapped `builtin` barrel.

**Tech Stack:** TypeScript (strict, `tsx`, npm), `node:crypto` sha256, `vitest` (new devDependency), `module-runner`.

**Spec:** `docs/superpowers/specs/2026-11-23-module-state-cache-design.md`

## Global Constraints

- No new runtime dependency; `vitest` is the only new devDependency. Hashing uses `node:crypto` only.
- No code comments (self-documenting code). Minimal diff; match existing style.
- Imports use explicit `.ts` extensions (`allowImportingTsExtensions`).
- Commits use `jj commit -m "<ISSUE?>: <description>"`, never `git`.
- Cache file is gitignored; it may hold real command output.
- The in-memory `Memo` base class (`src/lib/memo.ts`) and `Task` (`src/lib/task.ts`) stay unchanged.

## Review Focus

- **Corrupt / missing `cache.json`** → treated as empty, run proceeds. (Task 2)
- **A module that fails** → thrown, never written to cache; next run retries. (Task 3)
- **`check:true` dry run** → reads nothing, writes nothing; shows the real diff. (Task 3)
- **Key order / nested objects / arrays** → identical args in any key order hash equal; array order is significant. (Task 1)
- **`opts` affecting application** (`become`, `env`) → different opts produce a different hash. (Task 1)

---

### Task 1: Canonical serializer + hash (vitest setup)

**Files:**
- Modify: `package.json` (add `vitest` devDependency + `"test": "vitest run"` script)
- Create: `vitest.config.ts`
- Create: `src/lib/cache/canonical.ts`
- Test: `src/lib/cache/canonical.test.ts`

**Interfaces:**
- Produces: `canonical(value: unknown): string` (recursively key-sorted JSON, array order preserved, `undefined` entries dropped); `hashCall(args: unknown, opts: unknown): string` = `sha256(canonical({ args, opts }))` as hex.

- [ ] **Step 1: Add `vitest` and the `test` script to `package.json`; `npm install`.**

- [ ] **Step 2: Write `vitest.config.ts`** — minimal config; rely on vitest's native TS/ESM handling. Expected: `npm test` runs and reports "no test files" or runs the next step's file.

- [ ] **Step 3: Write the failing tests** in `src/lib/cache/canonical.test.ts`:

```ts
test("key order does not change the hash", () => {
  expect(hashCall({ a: 1, b: 2 }, {})).toBe(hashCall({ b: 2, a: 1 }, {}));
});
test("nested key order does not change the hash", () => {
  expect(hashCall({ x: { a: 1, b: 2 } }, {})).toBe(hashCall({ x: { b: 2, a: 1 } }, {}));
});
test("array order is significant", () => {
  expect(hashCall({ a: [1, 2] }, {})).not.toBe(hashCall({ a: [2, 1] }, {}));
});
test("undefined fields are ignored", () => {
  expect(hashCall({ a: 1, b: undefined }, {})).toBe(hashCall({ a: 1 }, {}));
});
test("opts change the hash", () => {
  expect(hashCall({ a: 1 }, { become: true })).not.toBe(hashCall({ a: 1 }, {}));
});
```

- [ ] **Step 4: Run `npm test` — expect FAIL** (`canonical`/`hashCall` not defined).

- [ ] **Step 5: Implement `canonical` and `hashCall` in `src/lib/cache/canonical.ts`.** Recursive: objects → sorted entries with `undefined` dropped, arrays → mapped in place, primitives → JSON. `hashCall` wraps `{args, opts}` and sha256-hexes it.

- [ ] **Step 6: Run `npm test` — expect PASS.**

- [ ] **Step 7: Commit** — `jj commit -m "add canonical args hashing for module cache"`

---

### Task 2: Context flags + CacheStore

**Files:**
- Modify: `src/lib/context.ts:5-11` (add `cacheDir?: string`/`noCache?: boolean`; leave `stateDir?`/`noState?` in place for Task 4 to remove alongside `StatefulMemo`, so the repo keeps typechecking between tasks)
- Create: `src/lib/cache/store.ts`
- Test: `src/lib/cache/store.test.ts`

**Interfaces:**
- Consumes: `currentContext()` from `../context`.
- Produces:
  - `type CacheEntry = { hash: string; output: unknown }`
  - `class CacheStore { get(host: string, id: string): Promise<CacheEntry | undefined>; set(host: string, id: string, entry: CacheEntry): Promise<void> }`
  - `cacheStore(): CacheStore` — memoized per resolved file path (`path.join(cacheDir ?? process.cwd(), "cache.json")`).

- [ ] **Step 1: Update `Context`** in `src/lib/context.ts` — add `cacheDir?: string` and `noCache?: boolean`. Leave `stateDir?`/`noState?` untouched (Task 4 removes them with `StatefulMemo`); removing them now breaks `tsc` because `StatefulMemo` still reads them.

- [ ] **Step 2: Write the failing tests** in `src/lib/cache/store.test.ts` (use a temp dir via `cacheDir`):

```ts
test("round-trips an entry", async () => {
  // set(host,id,{hash,output}) then get(host,id) returns the same entry
});
test("missing file reads as empty", async () => {
  // get on a fresh cacheDir returns undefined
});
test("corrupt json reads as empty", async () => {
  // write "{" to cache.json; get returns undefined, no throw
});
```

- [ ] **Step 3: Run `npm test` — expect FAIL.**

- [ ] **Step 4: Implement `store.ts`** — port `StateStore`'s load/`JSON.parse`-with-catch, `set` + atomic `flush` (temp file + `rename`) from `src/lib/memo.ts:46-99`, retyped to `CacheEntry`; `cacheStore()` reads `cacheDir` from `currentContext()` and memoizes per path.

- [ ] **Step 5: Run `npm test` — expect PASS.**

- [ ] **Step 6: Commit** — `jj commit -m "add cache store and cacheDir/noCache context flags"`

---

### Task 3: `wrap` utility

**Files:**
- Create: `src/lib/cache/wrap.ts`
- Test: `src/lib/cache/wrap.test.ts`

**Interfaces:**
- Consumes: `hashCall` (Task 1), `cacheStore`/`CacheEntry` (Task 2), `currentContext` (`../context`), `currentHost` (`module-runner`), `ModuleExecOpts`/`ModuleResult` types.
- Produces:
  - `type Wrapped<M> = M extends { (name: string, args: infer A, opts?: ModuleExecOpts): Promise<ModuleResult<infer R>> } ? (id: string, args: A, opts?: ModuleExecOpts) => Promise<ModuleResult<R>> : never`
  - `function wrap<B extends Record<string, unknown>>(barrel: B): { [K in keyof B]: Wrapped<B[K]> }`
  - test-only `__resetInRun(): void` to clear the module-level in-run map between cases.

**Behavior (per spec "Wrapped-module behavior"):** bypass when `opts.cache === false || ctx.noCache || opts.check`; else in-run dedupe keyed by `host.id` then id (same hash → shared promise, different hash → throw `duplicate id`); else persistent hit (stored hash === h → replay `output` as `{...output, changed:false, failed:false, skipped:false, status:"ok"}`) or miss (run, store on success, never store a throw).

- [ ] **Step 1: Write the failing tests** in `src/lib/cache/wrap.test.ts`. Mock `module-runner` so `currentHost()` returns a fixed `{ id: Symbol(), name: "h1" }`; build a fake barrel `{ demo }` where `demo` is a counting async fn returning `{ status:"ok", changed:true, failed:false, skipped:false, out: args?.out }`; run each case inside `withContext({ cacheDir: tmp }, ...)` and call `__resetInRun()` between cases:

```ts
test("same id + same args runs underlying once", async () => { /* two awaited calls, demo called 1x */ });
test("same id + different args throws", async () => { /* second call rejects /duplicate id/ */ });
test("persisted hash replays output with changed:false", async () => {
  // call once (demo 1x). __resetInRun(). call again: demo still 1x, result.changed===false, result.out preserved
});
test("cache:false runs every time and writes nothing", async () => { /* two calls, demo 2x; cache.json absent/empty */ });
test("noCache bypasses like cache:false", async () => { /* via withContext({noCache:true}) */ });
test("check:true reads and writes nothing", async () => { /* opts.check runs underlying, cache.json stays empty */ });
test("failed module is not cached", async () => {
  // demo throws once; __resetInRun(); next call runs underlying again (demo 2x), not replayed
});
test("passes id to underlying as the task name", async () => { /* demo first arg === id */ });
```

- [ ] **Step 2: Run `npm test` — expect FAIL.**

- [ ] **Step 3: Implement `wrap.ts`.** Module-level `Map<symbol, Map<string, { hash: string; promise: Promise<unknown> }>>` for in-run state; `wrap` maps barrel entries to functions calling `barrel[k](id, args, opts)` under the behavior above. Validate `Wrapped<M>` with `npx tsc --noEmit`; if the optional-args branch fails to infer, add a second conditional matching the `(args, opts)` overload.

- [ ] **Step 4: Run `npm test` — expect PASS.**

- [ ] **Step 5: Run `npx tsc --noEmit`** — the repo has a 31-error pre-existing baseline (`.superpowers/sdd/2026-11-23-module-state-cache/tsc-baseline.txt`); expect **no new errors**, and specifically none referencing `src/lib/cache`.

- [ ] **Step 6: Commit** — `jj commit -m "add module-cache wrap utility"`

---

### Task 4: Wire-up, remove StatefulMemo, migrate files.ts

**Files:**
- Create: `src/lib/cache/index.ts`
- Modify: `src/lib/memo.ts` (remove `StateInput`, `StatefulMemo`, `StateStore`, `storeFor`, `hash`, `equal`, `STATE_FILE`, `HostState`, `StateData`, `tmpSeq`; keep `Memo`)
- Modify: `src/lib/context.ts` (remove the now-unused `stateDir?`/`noState?` fields — nothing references them once `StatefulMemo` is gone)
- Modify: `src/lib/files.ts:1-61,94-131,201-210` (migrate off `StatefulMemo`)
- Modify: `.gitignore` (replace `/state.json` with `/cache.json`)

**Interfaces:**
- Consumes: `wrap` (Task 3), raw `module-runner/builtin`.
- Produces: `export const builtin = wrap(rawBuiltin)` and re-exports of `wrap`, `cacheStore` from `src/lib/cache/index.ts`.

- [ ] **Step 1: Write `src/lib/cache/index.ts`** — `import * as rawBuiltin from "module-runner/builtin"; export const builtin = wrap(rawBuiltin);` plus re-exports.

- [ ] **Step 2: Remove the stateful block from `src/lib/memo.ts`** — keep only `Memo`. Expected after: `src/lib/memo.ts` has no `crypto`/`fs` imports. Then remove the now-unused `stateDir?`/`noState?` fields from `Context` in `src/lib/context.ts`.

- [ ] **Step 3: Migrate `src/lib/files.ts`:**
  - Replace `import { copy, file as _file, shell } from "module-runner/builtin"` with the wrapped `builtin` from `../cache`; use `builtin.copy`, `builtin.file`, `builtin.shell`.
  - Drop `extends StatefulMemo`, `stateKey()`, `stateInput()` overrides, `memoizeState`, and the `StateInput`/`StatefulMemo` import. `AbstractFileSystem.create` becomes the direct parent-chain call (`if (parent) await parent.create(); return createSelf();`).
  - Keep the existing human id strings (`Copy file ${this.path}`, `Create directory ${this.path}`, `Execute ${this.path}`) as the required first arg — already unique per resource.

- [ ] **Step 4: Edit `.gitignore`** — `/state.json` → `/cache.json`.

- [ ] **Step 5: Run `npx tsc --noEmit`** — compare against the 31-error baseline (`.superpowers/sdd/2026-11-23-module-state-cache/tsc-baseline.txt`); expect **no new errors** from your changes. The pre-existing `src/lib/files.ts(4,26)` `./cronjob` error and the other 30 remain (unrelated, work-in-progress). Also run `npm test` — expect PASS.

- [ ] **Step 6: Commit** — `jj commit -m "memoize ansible modules via central cache; drop StatefulMemo"`

---

### Task 5: Live deploy verification

**Files:** none (verification only).

- [ ] **Step 1:** Pick one host and run the deploy twice: `npm run deploy -- -h <host>`.
- [ ] **Step 2:** Confirm the first run applies changes and writes `cache.json` (`host → id → {hash, output}`); the second run reports the `files.ts`-driven module calls as unchanged (skipped/replayed) with no host mutation.
- [ ] **Step 3:** Change one managed file's content, deploy once, confirm only that id re-runs; revert is not reconciled (expected per spec).
- [ ] **Step 4: Commit** any incidental fixes — `jj commit -m "..."`.
