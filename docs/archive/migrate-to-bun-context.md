# Context

## Current Task

The repo was migrated to Bun as the primary runtime/toolchain while preserving practical Node source compatibility.

This work is complete for the requested scope:

- Bun is now the package manager of record.
- The test runner was migrated from Vitest to `bun:test`.
- The active bundle/executable build flow was migrated to Bun.
- The old Node SEA assets were archived unchanged.
- The implementation plan used for the task was saved in `PLAN.md`.

## Current Architecture State

### Runtime entrypoints

- Main CLI: `src/index.ts`
- Validator CLI: `src/validator.ts`

### Runtime/package-info seam

The main runtime now resolves package metadata through a dedicated helper layer:

- `src/lib/runtime/package-info.ts`
- `src/lib/runtime/package-info-bun.ts`

Behavior:

- Node SEA: indirect `node:sea` load is preserved.
- Bun packaged runtime: package metadata can be read in Bun runtime without leaking Bun-only syntax into shared modules.
- Normal source runtime: package metadata falls back to repo `package.json`.

`src/index.ts` now performs async bootstrap so CLI version registration can await package metadata safely.

### Build and packaging

Active Bun build scripts:

- `scripts/build-config.ts`
- `scripts/build-bundle.ts`
- `scripts/build-bin.ts`

Current active behavior:

- `bun run build:bundle` builds `_build/bundle.js`
- `bun run build:bin` builds:
  - `_build/mockup-compiler-linux-x64`
  - `_build/mockup-compiler-windows-x64.exe`

Archived Node SEA assets:

- `docs/archive/node-sea/sea-config.json`
- `docs/archive/node-sea/build-sea.sh`

They were moved unchanged and are no longer the active build path.

### Tooling

Primary package manager:

- Bun with `bun.lock`

Key config changes:

- `bunfig.toml` added for Bun test config
- `package.json` scripts switched to Bun-first commands
- `tsconfig.json` now includes Bun typings alongside Node typings
- `eslint.config.js` updated for Bun-era file layout and test exceptions

Removed from active setup:

- `package-lock.json`
- `vite.config.ts`
- Vitest/Vite-specific active workflow assumptions

### Tests

All tests now run under `bun:test`.

Important test decisions:

- Mock-heavy suites were adjusted to Bun’s module mocking semantics.
- Some suites remain `// @ts-nocheck` by design where strict typing adds mock boilerplate without enough value:
  - `src/lib/config.test.ts`
  - `src/lib/proc/mock-processings.test.ts`
  - `src/lib/utils/bundler.test.ts`
  - `src/lib/utils/bundler-functions.test.ts`
  - `src/lib/xlreader/sheet-reader.test.ts`
  - `src/lib/xlreader/workbook-reader.test.ts`

This is intentional and should not be “cleaned up” casually unless there is a clear payoff.

## Architectural Decisions

### 1. Bun-first, Node-compatible core

Decision:

- Make Bun the primary package manager/runtime/toolchain.
- Keep the core runtime modules practical to execute under Node from source.

Why:

- This satisfies the migration goal without rewriting core logic around Bun-only APIs.
- The app logic, bundlers, file managers, and watcher remain runtime-agnostic where possible.

### 2. Runtime-specific packaging isolated behind a helper boundary

Decision:

- Keep packaged version/package-info resolution outside the shared core.

Why:

- Node should not parse Bun-only asset-loading syntax.
- Bun packaged runtime still needs a clean way to expose embedded package metadata.
- Existing indirect `node:sea` loading pattern was worth preserving.

### 3. Preserve the two-step build contract

Decision:

- Keep separate `build:bundle` and `build:bin` steps.

Why:

- The user asked to preserve that workflow shape.
- It keeps packaging easier to reason about and makes verification simpler.

### 4. Archive Node SEA instead of deleting it

Decision:

- Move old SEA assets unchanged into `docs/archive/node-sea`.

Why:

- The user explicitly requested archival with no content changes.
- It preserves prior packaging knowledge and compatibility reference material.

### 5. Prefer behavioral test fixes over framework emulation

Decision:

- Adapt tests to Bun semantics instead of trying to perfectly recreate Vitest behavior.

Why:

- Bun module mocking is similar but not identical.
- Hoisted/global mocks caused cross-suite leakage until suites were made more explicit.
- The resulting tests are more deterministic under Bun.

### 6. Keep explicit `.ts` imports

Decision:

- Retain explicit `.ts` import specifiers across the source graph.

Why:

- This was already an intentional repo choice.
- It continues to work with both direct source execution and bundling.

## Verification Status

Verified successfully during this task:

- `bun install`
- `bun run lint`
- `bun run typecheck`
- `bun test`
- `bun run verify`
- `bun run smoke:runtime`
- `bun run testrun:tz`
- `bun src/index.ts -c test-sample/.mock-config.json`
- `bun src/index.ts -c test-sample/.mock-config.json --bundle-format text --in-mem -d "" -z ../_dest/build.txt`
- `node src/index.ts -c test-sample/.mock-config.json`
- `bun run build:bundle`
- `bun run build:bin`
- `node --experimental-sea-config docs/archive/node-sea/sea-config.json`
- `./_build/mockup-compiler-linux-x64 --version`

Observed good outputs:

- `bun test` passed with 83 tests.
- Bun bundle build produced `_build/bundle.js`.
- Bun executable build produced Linux and Windows x64 binaries.
- Linux compiled binary reported version `1.2.1`.
- Runtime smoke outputs under `_dest` were generated successfully.

## Files Most Relevant For Restarting Work

If work resumes on this migration area, inspect these first:

- `PLAN.md`
- `CONTEXT.md`
- `package.json`
- `bunfig.toml`
- `tsconfig.json`
- `src/index.ts`
- `src/lib/runtime/package-info.ts`
- `src/lib/runtime/package-info-bun.ts`
- `scripts/build-config.ts`
- `scripts/build-bundle.ts`
- `scripts/build-bin.ts`
- `docs/archive/node-sea/sea-config.json`
- `docs/archive/node-sea/build-sea.sh`

If work resumes on Bun test behavior, inspect:

- `src/lib/utils/bundler-functions.test.ts`
- `src/lib/utils/bundler.test.ts`
- `src/lib/utils/mc-text-format.test.ts`
- `src/lib/proc/file-manager-excel.test.ts`

## Next Steps

No required next step remains for the requested scope.

Possible follow-up work, if requested later:

1. Update `on-new-tag.yml` publishing/install steps from npm-centric assumptions to Bun-aware release behavior.
2. Expand executable target coverage beyond Windows/Linux x64 if needed.
3. Decide whether to publish Bun-built binaries via CI releases.
4. Revisit any remaining docs outside the main active paths if broader documentation cleanup is desired.
5. Eventually fold `validator` into the main CLI if that earlier product direction becomes active.

## Known Compatibility Notes

- `mockup-compiler` is now Bun-shebang/Bun-native as installed CLI.
- `mockup-validator` was intentionally left unchanged.
- Core source execution still works under Node for the validated smoke path.
- Archived Node SEA config still works for producing the prep blob, but it is no longer the active packaging route.
