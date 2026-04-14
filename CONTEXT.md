# Context

## Current Task

This repo was migrated from JavaScript toward TypeScript in phases based on `PLAN.md`.

The current state:

- Phase 1 is complete: domain and runtime boundary types were extracted.
- Phase 2 is complete for the core runtime: the application now runs from `.ts` entrypoints and the main source graph has been converted.
- Phase 3 has started: structural cleanup was done where TypeScript exposed weak contracts or duplicated orchestration logic.
- Tests under `src/` have now been converted from `.js` to `.ts`.

The most recent user request completed in this session was:

- convert the remaining JS tests to TS
- keep the repo green after conversion
- create this `CONTEXT.md` file so work can be restored if the connection breaks

## Current Architecture State

### Runtime entrypoints

- CLI entrypoint: `src/index.ts`
- Validator entrypoint: `src/validator.ts`

### Type layer

Shared project types live in:

- `src/lib/types.d.ts`

This file contains the extracted contract layer used during migration, including:

- config types
- CLI arg types
- workbook and mock table types
- file manager contracts
- bundler contracts
- filesystem boundary interfaces
- meta calculator contract

### Converted runtime modules

The main runtime path is already TypeScript:

- `src/index.ts`
- `src/validator.ts`
- `src/lib/config.ts`
- `src/lib/args.ts`
- `src/lib/app.ts`
- `src/lib/watcher.ts`
- `src/lib/utils/logger.ts`
- `src/lib/utils/tabbed.ts`
- `src/lib/utils/fs-utils.ts`
- `src/lib/utils/mc-text-format.ts`
- `src/lib/utils/sha1-stream.ts`
- `src/lib/utils/bundler.ts`
- `src/lib/utils/bundler-functions.ts`
- `src/lib/utils/output-file-list.ts`
- `src/lib/xlreader/sheet-reader.ts`
- `src/lib/xlreader/workbook-reader.ts`
- `src/lib/proc/mock-processings.ts`
- `src/lib/proc/file-manager-base.ts`
- `src/lib/proc/file-manager-excel.ts`
- `src/lib/proc/file-manager-includes.ts`
- `src/lib/proc/meta.ts`

### Tests

All `src/**/*.test.*` files are now `.test.ts`.

Important nuance:

- `src/lib/utils/bundler.test.ts`
- `src/lib/utils/bundler-functions.test.ts`

are intentionally TypeScript files with `// @ts-nocheck`.

Reason:

- They rely on deliberately incomplete fake Node streams.
- Forcing strict typing there adds a large amount of mock boilerplate without improving product safety.
- The real runtime types should stay strict; the compromise is isolated to those two mock-heavy suites.

## Architectural Decisions

### 1. Staged migration instead of big-bang conversion

Decision:

- migrate boundaries first
- keep runtime working at every step
- verify after each conversion batch

Why:

- the tool has a CLI runtime, bundle build, watch mode, in-memory mode, and memfs-based tests
- broad renames without intermediate verification would be high-risk

### 2. Type extraction before conversion

Decision:

- create `src/lib/types.d.ts` first

Why:

- it gave the migration a stable contract layer
- it reduced repeated inference and ad hoc typing across modules
- it exposed weak abstractions early, especially around file managers and bundlers

### 3. Preserve direct runtime execution from TypeScript entrypoints

Decision:

- switch runtime scripts and bin targets to `.ts`
- keep Node-first execution working during migration

Why:

- the user explicitly asked to switch to TypeScript and do the renames
- this repo already uses an ESM-friendly setup and the staged TypeScript configuration can support this workflow

### 4. Keep tests in Vitest but avoid low-value type churn

Decision:

- convert tests to `.ts`
- type the straightforward suites normally
- use local casts for fixture-only mismatches
- allow `@ts-nocheck` only where fake stream objects would otherwise dominate the test code

Why:

- the user asked specifically to convert the tests
- full strict typing of all Vitest stream mocks created noise rather than useful guarantees

### 5. Tighten abstractions where TS exposed design gaps

Changes already made:

- `FileManagerBase` is now a real abstract contract
- filesystem capabilities were separated into `ReadableFsLike` and `WritableFsLike`
- `App` no longer relies on `memfs as never`
- watcher internal throttle naming was normalized
- `parseWorkbookIntoMocks` was added as a correctly spelled alias while keeping the old typo for compatibility
- duplicated output file-list assembly was extracted to `src/lib/utils/output-file-list.ts`

Why:

- these changes improved correctness and readability without changing user-facing behavior

## Tooling State

### package.json

The repo now includes:

- `typescript`
- `@types/node`
- `@types/lodash-es`
- `@types/picomatch`
- `@types/archiver`

Relevant scripts:

- `npm test`
- `npm run typecheck`
- `npm run build:bundle`
- `npm run build:bin`

### tsconfig.json

Important migration settings:

- `strict: true`
- `noEmit: true`
- `allowJs: true`
- `checkJs: false`
- `allowImportingTsExtensions: true`
- `moduleResolution: "Bundler"`

Why this matters:

- strict checking is enabled for TS
- JS is still allowed so the repo can be migrated incrementally
- explicit `.ts` imports are currently part of the staged migration approach

## Verification Status

Latest verified commands and outcomes:

- `npm run typecheck` -> passed
- `npm test` -> passed
- previous session verification also passed:
  - `node src/index.ts -c test-sample/.mock-config.json`
  - `npm run build:bundle`

Current known green test count:

- 14 test files
- 83 tests

## Files Most Relevant For Restarting Work

If work needs to resume, inspect these first:

- `PLAN.md`
- `CONTEXT.md`
- `tsconfig.json`
- `package.json`
- `src/lib/types.d.ts`
- `src/lib/app.ts`
- `src/lib/watcher.ts`
- `src/lib/utils/output-file-list.ts`
- `src/lib/proc/file-manager-base.ts`
- `src/lib/proc/mock-processings.ts`

If the next task is about tests, inspect:

- `src/lib/utils/bundler.test.ts`
- `src/lib/utils/bundler-functions.test.ts`
- `src/lib/proc/file-manager-excel.test.ts`
- `src/lib/config.test.ts`
- `src/lib/xlreader/sheet-reader.test.ts`

## Known Compatibility Choices

These are intentional and should not be “cleaned up” casually:

- explicit `.ts` import specifiers are allowed by `tsconfig.json`
- `parseWokbookIntoMocks` still exists for compatibility; `parseWorkbookIntoMocks` is the corrected alias
- bundler-related tests use `@ts-nocheck`
- tests remain in Vitest and still use mock-heavy patterns with memfs and Node module mocking

## Good Next Steps

The substantive migration is complete. The next work should be cleanup-oriented, not broad conversion.

Recommended next steps:

1. Do a focused Phase 4 pass for Bun/packaging readiness.
2. Review whether explicit `.ts` import specifiers should remain long-term or be replaced by a cleaner runtime/build strategy.
3. Decide whether to add lint coverage or TS-specific ESLint rules for the new `.ts` files.
4. Review remaining transitional compatibility exports and names.
5. If desired, revisit the two `@ts-nocheck` bundler tests only with a dedicated helper for typed fake streams. Do not push those casts into production code.

## Recovery Checklist

If the session breaks, resume with this sequence:

1. Open `PLAN.md` and `CONTEXT.md`.
2. Run `git status --short` to confirm workspace state.
3. Run `npm run typecheck`.
4. Run `npm test`.
5. If runtime validation is needed, run `node src/index.ts -c test-sample/.mock-config.json`.
6. Continue from the “Good Next Steps” section unless the user gives a more specific task.

## Last Completed User-Facing Result

The last completed deliverable before writing this file:

- all remaining JS tests in `src/` were converted to TS
- `npm run typecheck` passed
- `npm test` passed with 83/83 tests green
