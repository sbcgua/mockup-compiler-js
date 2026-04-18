# Reorganization Plan

## Goal

Restructure the source tree in a follow-up branch so directories reflect subsystem ownership more clearly and avoid “bucket” folders like `utils` and `lib` root miscellany.

This plan is intentionally separate from the Bun migration branch. The current branch should be completed and merged first, then this reorganization can be done as a focused structural change.

## Main Decisions

- Use `common` for true shared low-level helpers.
- Put config-related files under `cli`.
- Treat bundling as a processing/build subsystem, not as a generic utility.
- Treat `app`/watching as orchestration/runtime composition.
- Keep the next refactor mostly structural rather than behavioral.

## Problems In The Current Structure

The current tree mixes several grouping styles at once:

- some files are grouped by technical level
- some by feature
- some by “misc helper”
- some entrypoint-support files sit directly in `src/lib`

That makes ownership blurry:

- `logger` is a real shared helper
- `bundler` is not a generic utility, it is part of the processing output pipeline
- `args`, `config`, and some runtime helpers are CLI-facing concerns, not “core library root”
- `app` and `watcher` are orchestration, not generic library pieces

## Proposed Target Shape

Suggested top-level structure:

- `src/cli/`
- `src/app/`
- `src/processing/`
- `src/bundle/`
- `src/excel/`
- `src/common/`
- `src/types/`

## Proposed Regrouping

### `src/cli/`

Purpose:

- CLI boundary
- config/args parsing
- runtime bootstrap helpers directly tied to CLI startup

Suggested contents:

- `index.ts`
- `validator.ts`
- `args.ts`
- `config.ts`
- runtime/package-info helpers currently under `src/lib/runtime/*`

Notes:

- `config` belongs here per your preference.
- This folder should own “how the program starts” and “how external options become runtime config”.

### `src/app/`

Purpose:

- application orchestration
- long-lived runtime coordination

Suggested contents:

- `app.ts`
- `watcher.ts`
- `output-file-list.ts`

Notes:

- These files compose subsystems and run workflows.
- They are not CLI parsing, not compiler logic, and not low-level helpers.
- `output-file-list.ts` fits better here as an orchestration helper than under `bundle`.

### `src/processing/`

Purpose:

- high-level file processing pipeline
- conversion workflow for Excel/includes/meta

Suggested contents:

- current `src/lib/proc/*`

Likely files:

- `file-manager-base.ts`
- `file-manager-excel.ts`
- `file-manager-includes.ts`
- `meta.ts`
- `mock-processings.ts`

Notes:

- This is the core domain workflow layer.
- Use `processing` instead of `compiler` because it describes the subsystem more precisely.

### `src/bundle/`

Purpose:

- output bundle creation
- text/zip bundle format implementation

Suggested contents:

- `bundler.ts`
- `bundler-functions.ts`
- `mc-text-format.ts`

Notes:

- These files belong together conceptually.
- Keep this folder focused on actual bundle implementation.

### `src/excel/`

Purpose:

- Excel workbook/sheet parsing

Suggested contents:

- current `src/lib/xlreader/*`

Likely files:

- `sheet-reader.ts`
- `workbook-reader.ts`

Notes:

- Rename `xlreader` to `excel` for clarity.
- The current folder is understandable, but `excel` is simpler and more readable.

### `src/common/`

Purpose:

- true shared low-level helpers
- reusable support code with no strong subsystem ownership

Suggested contents:

- `logger.ts`
- `fs-utils.ts`
- `sha1-stream.ts`
- `tabbed.ts`

Notes:

- This should stay intentionally small.
- If a file is mostly owned by one subsystem, it should not live here.

### `src/types/`

Purpose:

- shared project-wide type contracts

Suggested contents:

- `src/types/index.d.ts`

Notes:

- The current `src/lib/types.d.ts` works, but it is conceptually broader than “lib internals”.

## Concrete Old -> New Mapping

- `src/index.ts` -> `src/cli/index.ts`
- `src/validator.ts` -> `src/cli/validator.ts`
- `src/lib/args.ts` -> `src/cli/args.ts`
- `src/lib/config.ts` -> `src/cli/config.ts`
- `src/lib/runtime/package-info.ts` -> `src/cli/package-info.ts`
- `src/lib/runtime/package-info-bun.ts` -> `src/cli/package-info-bun.ts`

- `src/lib/app.ts` -> `src/app/app.ts`
- `src/lib/watcher.ts` -> `src/app/watcher.ts`

- `src/lib/proc/file-manager-base.ts` -> `src/processing/file-manager-base.ts`
- `src/lib/proc/file-manager-excel.ts` -> `src/processing/file-manager-excel.ts`
- `src/lib/proc/file-manager-includes.ts` -> `src/processing/file-manager-includes.ts`
- `src/lib/proc/meta.ts` -> `src/processing/meta.ts`
- `src/lib/proc/mock-processings.ts` -> `src/processing/mock-processings.ts`

- `src/lib/utils/bundler.ts` -> `src/bundle/bundler.ts`
- `src/lib/utils/bundler-functions.ts` -> `src/bundle/bundler-functions.ts`
- `src/lib/utils/mc-text-format.ts` -> `src/bundle/mc-text-format.ts`
- `src/lib/utils/output-file-list.ts` -> `src/app/output-file-list.ts`

- `src/lib/xlreader/sheet-reader.ts` -> `src/excel/sheet-reader.ts`
- `src/lib/xlreader/workbook-reader.ts` -> `src/excel/workbook-reader.ts`

- `src/lib/utils/logger.ts` -> `src/common/logger.ts`
- `src/lib/utils/fs-utils.ts` -> `src/common/fs-utils.ts`
- `src/lib/utils/sha1-stream.ts` -> `src/common/sha1-stream.ts`
- `src/lib/utils/tabbed.ts` -> `src/common/tabbed.ts`

- `src/lib/types.d.ts` -> `src/types/index.d.ts`

## Test Reorganization

Keep tests adjacent to their implementation files during the reorg.

That means `.test.ts` files should move with their source files rather than being centralized.

Examples:

- bundle tests move with `src/bundle/*`
- processing tests move with `src/processing/*`
- excel tests move with `src/excel/*`
- common tests move with `src/common/*`

## Implementation Guidance For The Follow-Up Branch

Recommended order:

1. Move types first.
2. Move low-risk directories next:
   - `xlreader` -> `excel`
   - `utils` files that clearly belong in `common`
3. Move bundle subsystem.
4. Move processing subsystem.
5. Move `app` and `watcher`.
6. Move CLI/config/runtime bootstrap files last.
7. Update imports in one focused sweep.
8. Run full verification after each major move group.

## Safety Rules

- Keep this refactor behavior-preserving.
- Avoid renaming symbols unless the name is actively harmful.
- Prefer path moves over semantic rewrites.
- Do not mix new features into the reorg branch.
- Keep the branch easy to review by grouping moves by subsystem.

## Verification For The Future Reorg Branch

Minimum expected verification:

- `bun run lint`
- `bun run typecheck`
- `bun test`
- `bun run verify`
- `node src/cli/index.ts -c test-sample/.mock-config.json` or equivalent compatibility path after entrypoint moves

If package bin targets or scripts are updated during the reorg, also verify:

- `bun run smoke:runtime`
- `bun run build:bundle`
- `bun run build:bin`

## Optional Follow-Up Refinements

These are not required for the initial reorg:

1. Split shared type contracts into smaller files if `src/types/index.d.ts` becomes too large.
2. Consider whether `validator.ts` should remain a separate CLI or later merge into the main command.

## Recommended Scope Boundary

For the first reorg branch, the cleanest scope is:

- path moves
- import updates
- script/path fixes
- no behavior changes
- no public CLI changes

That should keep the branch reviewable and reduce risk.
