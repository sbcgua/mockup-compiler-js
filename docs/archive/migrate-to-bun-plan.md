# Bun Runtime Migration

## Summary

Migrate the repo to Bun as the primary runtime/toolchain while keeping the source graph runnable under Node where practical. Preserve the current two-step packaging shape (`build:bundle` then `build:bin`), but move the existing Node SEA assets unchanged into `docs/archive/node-sea/` and replace the active build flow with Bun-native bundling and Bun standalone executable builds for Windows x64 and Linux x64.

## Implementation Changes

### 1. Package management and repo tooling

- Replace npm as the package manager of record with Bun.
- Commit `bun.lock`, remove `package-lock.json`, and update docs/CI/scripts to use `bun install`, `bun run`, `bun test`, and `bunx` where needed.
- Update `package.json` scripts so Bun is the default entry for local development:
  - `test` -> `bun test`
  - `test:watch` -> `bun --watch test`
  - `verify` -> `bun run lint && bun run typecheck && bun test && bun run build:bundle`
  - runtime smoke scripts -> `bun src/index.ts ...`
  - keep `typecheck` on `tsc --noEmit`
- Remove Vitest/Vite-only toolchain deps and config from the active setup.
- Add `bunfig.toml` as the active Bun config:
  - test file settings replacing `vite.config.ts`
  - explicit conservative defaults only; do not opt into isolated installs or concurrent test execution during this migration
- Add Bun type support for the Bun-only packaging/runtime module:
  - install `@types/bun`
  - update `tsconfig.json` `types` to include both Node and Bun typings
- Update `.github/dependabot.yml` from `npm` to `bun` and keep the schedule unchanged.

### 2. Runtime entrypoints and compatibility seam

- Keep the core app/runtime modules Node-compatible:
  - preserve explicit `.ts` import specifiers
  - keep existing contracts in `src/lib/types.d.ts`
  - do not introduce Bun-only APIs into shared core modules like `App`, `Watcher`, bundlers, file managers, or config parsing
- Make `mockup-compiler` Bun-native as the installed package bin.
- Leave `mockup-validator` unchanged for this migration.
- Refactor version/package-info loading out of `src/index.ts` into a runtime helper with three branches:
  - Node SEA: keep the current indirect `node:sea` load and `isSea()` detection
  - Bun standalone executable: detect Bun via `process.versions.bun`, then load package metadata through a Bun-only helper/module that is safe to import only in Bun runtime
  - normal source runtime: read `package.json` from the repo path as today
- Keep the “indirect runtime probe” pattern for packaged execution instead of hard-importing runtime-specific modules into shared code.
- Use a Bun-only packaging helper/module to expose packaged `package.json` access for Bun builds, so Node never parses Bun-specific file-asset syntax.
- Convert CLI startup in `src/index.ts` to allow async version resolution cleanly before `commander.version(...)` is set.

### 3. Test runner migration from Vitest to Bun

- Replace all `vitest` imports with `bun:test`.
- Remove `vite.config.ts` after moving equivalent test settings into `bunfig.toml`.
- Keep the current suite structure and behavior intact; do not redesign tests.
- Adapt the few Vitest-specific helpers to Bun-compatible patterns:
  - replace `vi.mocked(...)` with explicit typed casts/helpers
  - replace `vi.importActual(...)` patterns with Bun-compatible mocking/import patterns
  - keep `vi`, `describe`, `test`, `expect`, hooks, and spies where Bun already supports them
- Preserve the existing pragmatic exception for the two mock-heavy bundler suites; keep them simple rather than adding low-value type boilerplate.
- Verify the current memfs-heavy and module-mocking suites still pass under Bun’s mock system before removing Vitest from dependencies.

### 4. Bun bundling and standalone executables

- Archive Node SEA assets unchanged:
  - move `sea-config.json` to `docs/archive/node-sea/sea-config.json`
  - move `bin/build-sea.sh` to `docs/archive/node-sea/build-sea.sh`
  - keep file contents unchanged
- Replace active packaging with Bun-native files:
  - add a Bun bundle config/helper for `build:bundle`
  - add a Bun executable build config/helper for `build:bin`
- Keep the two-step build shape:
  - `build:bundle` emits a single JS bundle to `_build/bundle.js`
  - `build:bin` consumes that bundle and produces standalone executables
- Implement `build:bin` as a Bun script, not shell-only glue, so target iteration and metadata are explicit and cross-platform.
- Default Bun binary outputs:
  - `_build/mockup-compiler-linux-x64`
  - `_build/mockup-compiler-windows-x64.exe`
- Use a checked-in Bun build config for:
  - entrypoint/bundle path
  - output names
  - target matrix
  - Windows icon/metadata
- Build with Bun compile targets for x64 only in this migration.
- Prefer standard x64 targets first; document baseline variants as optional follow-up if users hit AVX2/illegal-instruction issues.
- Keep Linux and Windows build generation possible from the same Bun build script via Bun cross-target compilation.
- Update release/build docs to describe Bun executable output instead of Node SEA as the active path.

### 5. Other Bun-related changes included in scope

- Update GitHub Actions:
  - Bun becomes the main install/test/build path
  - replace `npm ci` with `bun install --frozen-lockfile`
  - make the main verification job Bun-first
  - keep at least one Node compatibility smoke step for direct source execution and the archived Node SEA prep path if still useful as a compatibility check
- Update README and AGENTS-adjacent runtime/build docs:
  - installation instructions become Bun-first
  - active executable build docs point to Bun
  - Node SEA docs are described as archived compatibility material
- Remove active references to Vite/Vitest in lint config, tsconfig includes, and docs.
- Keep Node compatibility smoke coverage in the plan because the current architecture intentionally isolates runtime-agnostic contracts and already proved both Node and Bun can execute the source graph.

## Public APIs and Interface Impact

- User-facing CLI flags and config schema stay unchanged.
- `mockup-compiler` remains the primary CLI entrypoint, but its installed bin becomes Bun-native.
- `mockup-validator` remains unchanged in this migration.
- No changes to bundle formats, config keys, watch-mode semantics, or output layout.
- New internal interface surface:
  - a runtime/package-info helper boundary
  - a Bun packaging config/helper for bundling and compiled executables

## Test Plan

- Tooling verification:
  - `bun install --frozen-lockfile`
  - `bun run lint`
  - `bun run typecheck`
  - `bun test`
- Runtime smoke checks:
  - `bun src/index.ts -c test-sample/.mock-config.json`
  - `bun src/index.ts -c test-sample/.mock-config.json --bundle-format text --in-mem -d "" -z ../_dest/build.txt`
  - `node src/index.ts -c test-sample/.mock-config.json` to confirm source compatibility still holds
- Packaging checks:
  - `bun run build:bundle` produces `_build/bundle.js`
  - `bun run build:bin` produces Linux and Windows x64 executables
  - compiled executable `--version` reports the package version correctly from packaged metadata
- Behavioral regression checks:
  - existing `_dest` smoke assertions from CI remain valid
  - `text+zip` bundling still contains `bundle.txt`
  - watch mode still reprocesses changed files and re-bundles successfully
- CI acceptance:
  - Bun-first workflow green on Ubuntu
  - archived Node SEA files remain present and unchanged in `docs/archive/node-sea/`

## Assumptions and Defaults

- Confirmed defaults:
  - source runtime strategy: dual-runtime where practical
  - package manager policy: replace `package-lock.json` with `bun.lock`
  - Bun executable targets: Windows x64 and Linux x64 by default
  - installed `mockup-compiler` bin: Bun-native
  - `mockup-validator`: unchanged
- Architectural constraints carried into this plan:
  - explicit `.ts` imports remain intentional
  - core abstractions around file managers, bundlers, and output-file collection stay runtime-agnostic
  - mock-heavy bundler tests should stay pragmatic rather than over-typed
- External capability basis used for this plan:
  - Bun lockfile migration and `bun.lock`: https://bun.sh/docs/pm/lockfile
  - Bun test runner and Vitest/Jest-compatible mocks: https://bun.sh/docs/cli/test and https://bun.sh/docs/test/mocks
  - Bun standalone executables, embedded files, and cross-target compilation: https://bun.sh/docs/bundler/executables
  - Bun runtime detection and TypeScript typings: https://bun.sh/guides/util/detect-bun and https://bun.sh/docs/ecosystem/typescript
  - Dependabot Bun ecosystem support: https://docs.github.com/en/code-security/dependabot/ecosystems-supported-by-dependabot/supported-ecosystems-and-repositories
