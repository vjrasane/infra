# Module state cache — design

## Intent / why

Today change-detection is memoized **per task/resource** via `StatefulMemo`
(`src/lib/memo.ts`), whose only consumer is the filesystem hierarchy in
`src/lib/files.ts`. Each subclass hand-picks which fields define "changed"
(`stateInput` → `{plain, secret}`), hashes secrets field-by-field, and compares a
shallow snapshot.

Move to an **IaC-style state cache** that memoizes at the **Ansible module** level.
A module call with a given id and a given set of args/opts runs once; a later run
with the same id and an identical args+opts hash is skipped and its previous output
replayed. There is **no reconciliation** against the real host — this is purely a
cache answering "have we already run this module invocation?".

## Goals

- One centralized, on-disk cache file, keyed `host → { id → { hash, output } }`.
- Hash the **entire** args+opts object, stable regardless of key order; equality is
  hash equality.
- Memoize **modules**, delivered as a utility that wraps a collection barrel
  (`module-runner/builtin`, `community.*`, `ansible.posix`, …) and returns a record
  of the same modules, each memoizing to the central cache.
- Wrapped modules take a **required id string as the first argument** (the slot key;
  replaces the optional human task-name of the unwrapped module).
- On a cache hit, replay the stored module **output** so downstream reads of
  `stdout` / facts / `container` still work (`status:"ok", changed:false`).
- Per-call `{cache:false}` escape hatch and a global `noCache` context flag.
- Duplicate-id safety: same id with different args ⇒ throw.

## Non-goals

- No reconciliation / drift detection against the host. Cache can lie after a
  revert; clearing the cache file is the reset.
- No change to the in-memory `Memo` / `Task` handler-notify machinery
  (`src/lib/task.ts`) — that stays as is.
- No migration of the on-disk format from the old `state.json` — the format changes
  and the old file is simply discarded (it is gitignored, never committed).

## Anti-goals

- A wrapped module whose cached output is replayed must not re-execute on a hit —
  if it did, caching read-heavy modules (`command`, `shell`, `setup`) would be
  pointless.
- The utility must preserve each module's precise `TArgs` / `TReturn` types. A
  wrapper typed as `any` is a failure even if it runs.

## Constraints

- TypeScript strict, run via `tsx`, no build step, npm. No test framework in repo.
- Hashing: `node:crypto` `createHash("sha256")` only — no new dependency. Canonical
  serialization is hand-rolled (recursively key-sorted JSON).
- Modules come from `module-runner`; each is a `ModuleFn<TArgs,TReturn>` overload
  pair callable as `mod(args, opts?)` or `mod(name, args, opts?)`. Result type is
  `ModuleResult<TReturn>` (`ok|changed|failed|skipped` union; all carry `changed`).
- Async context via `AsyncLocalStorage` (`src/lib/context.ts`); ambient host via
  `currentHost()` (`host.id` symbol, `host.name` string).
- Deploy is a one-shot CLI (`tsx src/index.ts`), multiple hosts run concurrently
  under one root context; `currentHost()` switches per host.

## Approaches considered

**Keying — how a slot is identified**

- *Set of arg-hashes* (`host → Set<hash>`): no per-call id needed, but old hashes
  linger forever and "keep only the latest" is impossible. Rejected.
- *Derived identity* (fqcn + primary arg like `name`/`dest`/`path`): needs
  per-module knowledge of which arg is the primary key; brittle across collections.
  Rejected.
- **Explicit required id (chosen):** caller supplies a unique id string as the first
  arg. One slot per id, overwritten with the latest hash. No per-module logic, and
  the id doubles as the human task-name in logs.

**Where memoization lives**

- *Patch `module-runner` / `defineRemoteModule`:* touches an external dependency,
  applies to every module whether wanted or not. Rejected.
- **Barrel-wrapping utility (chosen):** `wrap(barrel)` maps a record of `ModuleFn`s
  to a record of memoizing functions. Opt-in per collection, no dependency changes,
  types preserved via a mapped type.

## The decided design

### Directory: `src/lib/cache/`

```
src/lib/cache/
  store.ts    CacheStore: load / get / set / atomic flush; resolves cache file path
  wrap.ts     wrap(barrel): the memoizing wrapper + id dedupe/guard + hashing
  index.ts    re-exports (wrap, cache file helpers)
```

`StatefulMemo`, `StateInput`, the old `state.json` constant, `hash`, `equal`,
`StateStore`, `storeFor` are **removed** from `src/lib/memo.ts`. The in-memory
`Memo` base class **stays** (used by `Task`).

### On-disk format

File `cache.json` at `cacheDir ?? process.cwd()`. Added to `.gitignore`
(replacing the existing `/state.json` entry).

```jsonc
{
  "<host.name>": {
    "<id>": { "hash": "<sha256 hex>", "output": { /* stored module result */ } }
  }
}
```

Atomic write preserved from the current `StateStore.flush` (temp file + `rename`).

### Hashing

`hash(args, opts) = sha256(canonical({ args, opts }))` where `canonical` is a
recursive serializer that sorts object keys, preserves array order, and drops
`undefined`. Opts are included because `env` / `become` change what is actually
applied. Inputs are assumed JSON-serializable (true across the codebase: args and
opts are resolved plain objects by call time).

### Wrapped-module behavior

Signature: `wrapped(id: string, args: TArgs, opts?: ModuleExecOpts) => Promise<ModuleResult<TReturn>>`
(`args` optional when `{} extends TArgs`, mirroring the source overload).

Per call, with `h = hash(args, opts)` and ambient `host`:

1. **Bypass** — if `opts.cache === false` **or** context `noCache` **or**
   `opts.check === true`: call the underlying `mod(id, args, opts)` directly. No
   cache read/write, no dedupe, no guard. (`check` passes through so a dry run shows
   the real diff.)
2. **In-run dedupe / duplicate guard** — look up an in-run record for `(host.id, id)`:
   - present and recorded hash `=== h` → return the recorded in-flight promise.
   - present and recorded hash `!== h` → **throw** `duplicate id "<id>"` (two
     resources share an id).
   - absent → record `{ hash: h, promise }` and continue to step 3.
3. **Persistent cache** — read `store.get(host.name, id)`:
   - present and stored hash `=== h` → **hit**: return the stored `output` with
     `changed:false, failed:false, skipped:false, status:"ok"` spread over it.
   - otherwise → **miss**: `await mod(id, args, opts)`; on success,
     `store.set(host.name, id, { hash: h, output: result })`; return `result`.
     A failed module throws (as today, via `ModuleError`) and is **not** stored.

In-run dedupe state: module-level `Map<host.id, Map<id, {hash, promise}>>` in
`wrap.ts`, keyed by `host.id` (not context), so concurrent hosts replaying the same
ids don't collide. A one-shot CLI needs no reset.

### Types

```ts
type Wrapped<M> =
  M extends { (name: string, args: infer A, opts?: ModuleExecOpts): Promise<ModuleResult<infer R>> }
    ? (id: string, args: A, opts?: ModuleExecOpts) => Promise<ModuleResult<R>>
    : never;

declare function wrap<B extends Record<string, unknown>>(barrel: B): { [K in keyof B]: Wrapped<B[K]> };
```

Inference matches the 3-arg overload (`infer` resolves overloads to the last
signature, which is the `(name, args, opts)` form). The builder validates with
`tsc --noEmit` against `builtin` and at least one generated collection; if inference
fails for the optional-args branch, fall back to matching both overload shapes.

### Context changes (`src/lib/context.ts`)

- Replace `stateDir?` / `noState?` with `cacheDir?: string` / `noCache?: boolean`.
- No `seenIds` in context (per-host dedupe lives in `wrap.ts` keyed by `host.id`).

### `files.ts` migration

- Drop `extends StatefulMemo`, `stateKey`, `stateInput`, `commonOpts`-as-state,
  `memoizeState`, `runCreate`-wrapping. `AbstractFileSystem` keeps the parent-chain
  `create` (`if (parent) await parent.create(); return createSelf();`) but calls it
  directly — module-level dedupe replaces the object-level `Memo`.
- Import the **wrapped** `copy` / `file` / `shell` from `src/lib/cache` (wrapping
  `module-runner/builtin`) instead of raw `module-runner/builtin`.
- The id is the existing human string already passed, e.g. `Copy file ${this.path}`,
  `Create directory ${this.path}`, `Execute ${this.path}`. These are already unique
  per resource. Repeated `cronDir.create()` calls now hit same-id/same-args dedupe.
- `Content.createSelf` emits two module calls (dir + copy) with distinct ids, each
  cached separately — finer-grained than the old single combined snapshot, and
  correct.

### Other call sites

`src/common.ts`, service modules, etc. that import raw `module-runner/builtin` keep
working unchanged (unwrapped). Migrating them to wrapped+id is out of scope for this
change except where `files.ts` requires it. A shared wrapped barrel
(`export const builtin = wrap(rawBuiltin)`) is provided for future use.

## Left to the builder

- Exact `canonical` serializer implementation and its handling of nested arrays /
  objects / `undefined`.
- Final `tsc`-validated form of `Wrapped<M>` / `wrap`, including the optional-args
  overload branch.
- Whether `cacheDir`/`noCache` are threaded from CLI flags in `src/index.ts` now or
  left defaulting (current code never sets them); default-only is acceptable.
- `.gitignore` edit: replace `/state.json` with `/cache.json`.
