<!-- markdownlint-disable MD041 -->
[![Build Status](https://github.com/sbcgua/mockup-compiler-js/actions/workflows/main.yml/badge.svg)](https://github.com/sbcgua/mockup-compiler-js/actions/workflows/main.yml)
[![npm version](https://badge.fury.io/js/mockup-compiler-js.svg)](https://badge.fury.io/js/mockup-compiler-js)
[![Known Vulnerabilities](https://snyk.io/test/github/sbcgua/mockup-compiler-js/badge.svg?targetFile=package.json)](https://snyk.io/test/github/sbcgua/mockup-compiler-js?targetFile=package.json)

# Mockup compiler JS

Converts a set of Excel files in a given directory to a set of tab-delimited text files and zips them (or saves them in a single text file; see below). Generally, it is intended for the [ABAP Mockup loader](https://github.com/sbcgua/mockup_loader) and as a faster alternative to the [ABAP Mockup compiler](https://github.com/sbcgua/mockup_compiler). It can also be used for DevOps flows around the Mockup loader.

## How it works

1. Finds all `*.xlsx` in the given directory.
2. In each file, find the sheets to convert:
    - **By default**, converts all sheets with names not starting with `'-'`. *This is the recommended approach*.
    - Additionally (*This is an outdated approach and might be deprecated in the future*):
        - looks for the `_contents` sheet with 2 columns. The first is a name of another sheet in the workbook, the second includes the sheet into conversion if not empty. See example `test.xlsx` in the `test-sample` dir. If found, listed sheets are converted. 
        - If `_exclude` sheet is present, then the list of sheets in the first column (except the first line - column name) are excluded from processing. This happens on top of `_contents` sheet. See example `test.xlsx` in the `test-sample` dir.
3. All the relevant sheets are converted into tab-delimited text files in UTF-8.
    - each sheet should contain data, starting in cell A1
    - if A1 contains `#` at the beginning, this row is skipped (it is for comments) and the header is read from B1
    - `"-"`-prefixed columns at the beginning are ignored and can be used for metadata (you can also alter the character with the `skipFieldsStartingWith` config param)
    - columns after *the first empty column* are ignored
    - rows after *the first empty row* are ignored
4. All the files are saved to the given destination folder...
5. ... and optionally zipped into archive (`bundlePath` config param)
6. The file path in the zip will be `<excel name in lower case>/<sheet name>.txt`
7. If specified, files from the `includes` directory can also be added (e.g. some non-table data, XML files ...)
8. Optionally, `.meta` files are created (`withMeta` config param) with SHA1 hashes of the source files. This is useful for integrity, overview, and version control.

### Text format

Since version 1.2.0, there is a feature to build the resulting file in text, not zip. The motivation is to keep the resulting file readable and "diffable" in git repositories. Obviously, the data is not compressed in this case. Importantly, only text-file includes are currently supported, and only in UTF-8 encoding (please post an issue if this feature is required; our team does not use binary includes at the time being, however, the implementation is definitely possible via Base64 encoding).

```text
!!MOCKUP-LOADER-FORMAT 1.0
!!FILE /xyz/123.txt text 2
BUKRS NAME
0101  My Company 1
0102  My Company 2
!!FILE /xyz/234.txt text 2
...
```

To apply, use `"bundleFormat": "text"` in the config file or `--bundle-format text` command line option.

See [docs/text-bundle-format.md](docs/text-bundle-format.md) for more format details.

In addition, there is `text+zip` format. It creates a text bundle file (`bundle.txt`) and packs it into a zip archive. The motivation is to improve performance of the `zmockup_loader_switch_source` tool, which redirects mockup source to a local file. SAP GUI is rather slow in reading files from the desktop, so the text bundle is zip-compressed, uploaded by the GUI, and then unpacked at the server side (by the `zmockup_loader_switch_source` tool). The result is the same as with `text` format but works faster. Read more within the [ABAP Mockup compiler](https://github.com/sbcgua/mockup_compiler) documentation.

## Installation

The default approach is to install it as a Bun package. It assumes you have [Bun](https://bun.sh/) installed.

Important: the current runtime executes directly from `.ts` sources, so Bun v1.3+ is recommended. Direct source execution under Node is still kept as a compatibility path.

```bash
bun install -g mockup-compiler-js
```

Alternatively, you can download a binary from [Releases](https://github.com/sbcgua/mockup-compiler-js/releases). The active binary build now uses Bun standalone executables, and you can build them locally with `bun run build:bundle` and `bun run build:bin` - the resulting binaries (Windows and Linux) are placed into the `_build` directory. The older Node SEA flow is archived under [docs/archive/node-sea](docs/archive/node-sea) for compatibility reference.

## Running

Typical params to specify: source directory (`-s`), build directory (`-d`), optionally includes directory (`-i`), optionally a path to the bundle file (`-z`). Example:

```bash
mockup-compiler -s ./src-dir -d ./dest-dir -i ./static-assets -z ./build.zip
```

The best long-term approach is to use a [config file](#config).

See also `mockup-compiler --help` for the full list of options.

The help output also shows a `compile` subcommand. This is the default command, so `mockup-compiler ...` and `mockup-compiler compile ...` are equivalent.

The CLI also supports validating a text bundle:

```bash
mockup-compiler validate ./build.txt
```

If you need to execute the sources directly under Node for compatibility reasons, the validated smoke path is:

```bash
node src/cli/index.ts -c test-sample/.mock-config.json
```

## Watch mode

The tool can also be run in the **watch mode**. In this case, after the first build, the tool starts watching the source files - if they change, it re-runs conversion on the changed file again and re-bundles them (if requested).

Important: watch mode does not clean outputs for removed source items, so if you delete a sheet or include file, restart the watcher to avoid stale generated files.

```bash
mockup-compiler ... --watch
```

## Config

The setting can be given in a config. By default, the program looks for the config in the current directory in the file `.mock-config.json`. Optionally, it can be referred to with the `-c` command option. Example:

```jsonc
{
    "sourceDir": ".",
    "pattern": "*.xlsx",    // optional
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

Invoke with:

```bash
mockup-compiler -c ./my-mock-config.json
```

- All params are optional except source and destination dirs.
- Params starting from `#` are ignored (this is more for testing and temp settings).
- **Important**: the paths are calculated relative to current work directory unless given as absolute paths.
- If `bundlePath` is not specified, zip/text bundle file will not be created, just tab-delimited texts.
- `eol` - defines which end-of-line character to use: Linux style (LF) or Windows style (CRLF). *We recommend LF*, which is also the default.
- `includes` - optionally defines a directory to directly copy files from, in addition to Excel processing. *Currently supports only one include dir*.
- `withMeta` instructs the compiler to create `.meta/src_files` with SHA1 hashes of source files (for integrity and compatibility with the ABAP version of the tool).
- `cleanDestDirOnStart` deletes the destination dir before file processing. Importantly, it does not clean the dir in watch mode, so changes are written on top of the existing files structure. Thus, e.g., deleting a sheet in Excel will **not** delete its already compiled representation - this can lead to subtle bugs, so just restart the watcher when needed.
- `skipFieldsStartingWith` - skips fields which start from the given symbol, by default it is `'-'`
- **CHANGED** since v1.2.0: `bundleFormat` - defines the format of the bundle file:
  - `zip` (the default, if empty)
- `text` (see [docs/text-bundle-format.md](docs/text-bundle-format.md)); the resulting file can be checked with `mockup-compiler validate <file>`
  - `text+zip` - creates a text bundle and then zips it (decreases travel time to the ABAP backend; use when the bundle becomes large and slow)
- `pattern` - is a glob pattern for Excel files. By default it is `"*.xlsx"`, however the tool supports all formats supported by the underlying library [sheetjs](https://www.npmjs.com/package/xlsx). The param can be a string or an array, e.g. `["*.xlsx", "*.xml"]`.
- `inMemory` - don't create mocks on the disk (in `destDir`), instead stash them in memory and write only the bundle file. Beware of potential memory usage if the data volume is large. (in CLI, use `--in-mem`).
  - CLI equivalent: `--in-mem`
