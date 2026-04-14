# Archived Document

Historical reference for the completed TypeScript migration.

This is not an active plan for ongoing work.

---

# TypeScript Migration Plan

## Summary

Migrate the project from ESM JavaScript to TypeScript in staged, behavior-preserving phases, using a Bun-friendly TypeScript
configuration from the start while keeping runtime execution Node-first. The first implementation phase will focus on extracting and
validating the domain types before broad file conversion, so the type model can be reviewed separately from behavioral refactors. The
current CLI behavior, test suite, `build:bundle` flow, and SEA-based `build:bin` process remain supported.

## Implementation Changes

1. Toolchain foundation
    - Add Bun-oriented TypeScript configuration as the base, but keep Node execution and packaging as the active runtime target.
    - Use staged migration settings: `allowJs` during transition, `checkJs` only where useful, strict mode enabled for migrated TypeScript
    files, and explicit temporary escape hatches at JS/TS boundaries.
    - Update build scripts so `build:bundle` works from TypeScript sources without changing the external CLI contract.
    - Isolate Node-only packaging logic for SEA so the typed core stays runtime-agnostic where practical.
2. Phase 1: Type extraction and validation
    - Introduce a dedicated types layer before broad file renames.
    - Extract and review the core domain shapes now implicit in the code:
        - `AppConfig` and validated config variants
        - CLI argument shape and arg-to-config overlay shape
        - Workbook and sheet-derived row models
        - Row-array metadata shape such as __columns__, __isempty__, __rowNum__, __sheetName__
        - File manager contracts, event payloads, and bundle item shape
        - Bundle format interfaces and stream-facing contracts
    - Define explicit interfaces for the main injected boundaries:
        - mock extractor
        - mock processor
        - file manager base contract
        - bundler function signature
        - logger contract used by `App` and `Watcher`
    - Keep this phase low-risk: add types and annotations first, without changing runtime behavior unless needed to express a safe type
    boundary.
3. Phase 2: Boundary-first conversion
    - Convert lowest-risk, pure modules first:
        - config parsing/validation
        - tab formatting
        - filesystem path helpers
        - text bundle formatter
        - SHA1 helper
    - Convert Excel-reader modules next, because they define the most important shared data model.
    - Convert processing modules after the type model is stable:
        - workbook-to-mocks extraction
        - Excel file manager
        - include file manager
        - meta calculator
        - bundler
    - Convert orchestration last:
        - `App`
        - `Watcher`
        - CLI entrypoints
        - validator CLI
4. Phase 3: Structural cleanup enabled by TypeScript
    - Replace ad hoc object augmentation where useful with explicit typed helpers or wrapper types.
    - Tighten abstract/base contracts, especially around `FileManagerBase`, event names, and shared output lists/maps.
    - Normalize misspelled or ambiguous internal names only when covered by tests and kept backward-compatible internally.
    - Reduce hidden coupling in `App` setup by introducing typed constructor options and clearer dependency boundaries.
5. Phase 4: Bun-ready follow-through
    - Keep tsconfig, module resolution, and script layout compatible with future Bun adoption.
    - Avoid introducing new Node-only assumptions into the typed core.
    - Do not require Bun runtime parity yet; the goal is a clean future switch path, not dual-runtime support in phase one.

## Public APIs, Interfaces, and Type Additions

- Preserve current package behavior:
    - `mockup-compiler` CLI entrypoint
    - `mockup-validator` CLI entrypoint
    - current config file schema and command flags
- Add explicit exported internal types for migration safety, even if they are not yet treated as a formal public library API.
- Expected type additions include:
    - `AppConfig`, `RawConfig`, `ConfigOverloads`
    - `BundleFormat`, `EolMode`
    - `MockRow`, `MockTable`, `WorkbookMocks`
    - `MockProcessorResult`
    - `FileManagerProcessedItemEvent`, `FileProcessingStartedEvent`

## Test Plan

- Add focused tests for newly extracted types indirectly through runtime behavior:
    - config normalization and validation branches
    - workbook/sheet metadata handling
    - mock processor column/row trimming behavior
    - file manager event payload shape
    - bundler function contracts
- Add one or two smoke tests around the TypeScript-aware build path:
    - `build:bundle` succeeds from TypeScript sources
    - CLI entrypoint still runs against sample config
- Add a compile-time verification step to CI or local scripts:
    - `tsc --noEmit` during migration
    - later tighten this to fail on remaining unchecked JS when conversion is complete

## Assumptions and Defaults

- Migration mode: strict staged
- Package shape: CLI-first
- Bun scope: Bun-ready config only, not dual runtime support yet
- Packaging scope: preserve SEA support, but isolate it from the typed core; `build:bundle` must remain compatible with the TypeScript
toolchain and `build:bin` stays supported
- Recommended artifact path for this plan once file writing is allowed: `docs/typescript-migration-plan.md`
- Recommended migration order is behavior-preserving and test-driven rather than big-bang file renaming
