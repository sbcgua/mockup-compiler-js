# AGENTS.md - Project Guidelines

## Project Overview

The tool converts a set of excel files to a set of tab-delimited text-files and bundles them as zip or saves in a single text file. Each sheet of an Excel file becomes a separate text file. Such a bundle is then used as an integration unit test data source (for another tool, called mockup_loader). The processing parameters can be passed via the args or a dedicated json config.

Typical logic:

1. Finds all `*.xlsx` in the given directory.
2. In each file, find the sheets to convert: by default, converts all sheets with names not starting with `-`.
3. All the listed sheets are converted into tab-delimited text files in UTF8.
    - each sheet assumed to contain data, staring in A1 cell
    - if A1 contains `#` at the beginning this row is skipped (it is for comments) and the header is read from B1
    - `-` prefixed columns at the beginning are ignored (unless defined other prefix via processing params)
    - columns after *the first empty column* are ignored
    - rows after *the first empty row* are ignored
4. All the files are saved to the given destination folder (or in memory)
5. Then optionally zipped into archive or a single text-file with a special format (see @docs/text-bundle-format.md)
6. The sheet path inside the bundle will be `<excel name in lower case>/<sheet name>.txt`
7. If configured, the tool includes files from `includes` directory (e.g. some non-table data, XMLs ...)
8. Optionally, `.meta` file is created with sha1 hashes of the source files. It useful for integrity, overview and version control.

## Running

Command line params are defined in @src/lib/args.js
Importantly, the tool can also be run in the **watch mode** (`--watch` arg). In this case, after the first build, the tool starts watching the source files - if they change, it re-runs conversion on the changed file again and re-bundles them.

The setting can be given in a config. By default the programs looks for the config in the current directory in file `.mock-config.json`. Optionally, can be referred with `-c` command opt. Example of the file:

```json
{
    "sourceDir": ".",
    "pattern": "*.xslx",    // optional
    "eol": "lf",            // lf or crlf, optional
    "destDir": "_dest",
    "bundlePath": "_dest/build.zip",
    "bundleFormat": "zip",
    "includes": [
        "_dest/_inc"
    ],
    "skipFieldsStartingWith": "-",
    "withMeta": true,
    "cleanDestDirOnStart": false
}
```

- All params are optional except source and destination dirs
- Params starting from `#` are ignored (this is more for testing and temp settings)
- The paths are calculated relative to current work directory unless given as absolute paths
- If `bundlePath` is not specified, zip/text bundle file will not be created, just tab-delimited texts.
- `eol` - defines which end-of-line character to use: linux style (LF) or window style (CRLF).
- `includes` - optionally defines a dir to directly copy files from, in addition to excel processing. *Currently supports only one include dir*.
- `withMeta` instructs the compiler to create `.meta/src_files` with SHA1 hashes of source files (for integrity and compatibility with abap version of the tool)
- `cleanDestDirOnStart` deletes the destination dir before file processing. Importantly, it does not cleans the dir in watch mode.
- `skipFieldsStartingWith` - skips fields which start from the given symbol, by default it is `-`
- `bundleFormat` - defines the format of the budle file:
  - `zip` (the default, if empty)
  - `text` (see [doc/text-bundle-format.md](doc/text-bundle-format.md))
  - `text+zip` - creates a text bundle and then zips it
- `pattern` - is a glob pattern for Excel files. By default it is "*.xlsx", however the tool support all formats which are supported by the underlying library [sheetjs](https://www.npmjs.com/package/xlsx). The param can be a string or an array, e.g. `["*.xlsx", "*.xml"]`.
- `inMemory` - don't create mocks on the disk (in `destDir`), instead stash them in memory and write only the bundle file.

## Build

In addition to regular js execution, the tool can be bundled in a single execution application:

- `npm run build:bundle` - to build single js bundle
- `npm run build:bin` - to build SEA from it

## Testing

The project uses vitest framework. Exec tests with `npm run test`.

## File Structure

- the tool is invoke via `src/index.js`
- there is a standalone sub-tool `src/validator.js` to validate single text bundle format
- `src/lib/xlreader` contains components related Excel reading
- `src/lib/utils` contains low level componentsm like bundler, logger, single text bundle format logic, etc
- `src/lib/proc` contains high level components that reuse utils and process excel files, includes and separate excel sheets
- `src/lib` root contains runtime components, like config reader, args parser and watcher
