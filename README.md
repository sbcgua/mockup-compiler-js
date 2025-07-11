<!-- markdownlint-disable MD041 -->
[![Build Status](https://github.com/sbcgua/mockup-compiler-js/actions/workflows/main.yml/badge.svg)](https://github.com/sbcgua/mockup-compiler-js/actions/workflows/main.yml)
[![npm version](https://badge.fury.io/js/mockup-compiler-js.svg)](https://badge.fury.io/js/mockup-compiler-js)
[![Known Vulnerabilities](https://snyk.io/test/github/sbcgua/mockup-compiler-js/badge.svg?targetFile=package.json)](https://snyk.io/test/github/sbcgua/mockup-compiler-js?targetFile=package.json)

# Mockup compiler for node js

Converts set of excels in a given directory to a set of tab-delimited text-files and zip them (or saves in a single text file - see below). Generally, it is intended for the [ABAP Mockup loader](https://github.com/sbcgua/mockup_loader) and as a faster alternative of the [ABAP Mockup compiler](https://github.com/sbcgua/mockup_compiler). It can also be used for devops flows around the Mockup loader.

## How it works

1. Finds all `*.xlsx` in the given directory.
2. In each file, find the sheets to convert:
    - **By default**, converts all sheets with names not starting with `'-'`. *This is the recommended approach*.
    - But also: searches for `_contents` sheet with 2 columns. The first is a name of another sheet in the workbook, the second includes the sheet into conversion if not empty. See example `test.xlsx` in the `test-sample` dir. If found, listed sheets are converted. *This is an outdated approach and might be deprecated in the future*
    - If `_exclude` sheet is present, then the list of sheets in the first column (except the first line - column name) are excluded from processing. This happens on top of `_contents` sheet. See example `test.xlsx` in the `test-sample` dir. *This is an outdated approach and might be deprecated in the future*
3. All the listed sheets are converted into tab-delimited text files in UTF8.
    - each sheet should contain data, staring in A1 cell
    - if A1 contains `#` at the beginning this row is skipped (it is for comments) and the header is read from B1
    - `"-"` prefixed columns at the beginning are ignored, can be used for some meta data (you can also alter the character with `skipFieldsStartingWith` config param)
    - columns after *the first empty column* are ignored
    - rows after *the first empty row* are ignored
4. All the files are saved to the given destination folder...
5. ... and optionally zipped into archive (`bundlePath` config param)
6. The file path in the zip will be `<excel name in lower case>/<sheet name>.txt`
7. If specified, files from `includes` directory explicitly added too (e.g. some non-table data, xmls ...)
8. Optionally, `.meta` files are created (`withMeta` config param) with sha1 hashes of the source files. It useful for integrity, overview and version control.

### Text format (experimental)

Since version 1.2.0, there is an expremental feature to build the resulting file in text, not zip. The motivation is keep the resulting file readable and "diffable" in git repositories. Obviosuly, the data is not copressed in this case. Importantly, only text file includes are currently supported, and only in utf-8 encoding (please post an issue if this feature is required, our team does not use binary includes at the time being, however, the implementation is definitely possible though with the base64 encoding).

```text
!!MOCKUP-LOADER-FORMAT 1.0
!!FILE /xyz/123.txt text 2
BUKRS NAME
0101  My Company 1
0102  My Company 2
!!FILE /xyz/234.txt text 2
...
```

See [doc/text-bundle-format.md](doc/text-bundle-format.md) for more format details.

P.S. One even more experimental features is `text+zip` format - it creates a text bundle file (`bundle.txt`) and packs it into zip. The motivation is to improve performance of `zmockup_loader_switch_source` tool, which redirects mockup source to a local file. Read more withing [ABAP Mockup compiler](https://github.com/sbcgua/mockup_compiler) documentation.

## Installation

The default approach is to install it as an NPM package. It assumes you have [nodejs](https://nodejs.org/) installed.

```bash
npm install -g mockup-compiler-js
```

Alternatively, you can download a binary from [Releases](https://github.com/sbcgua/mockup-compiler-js/releases). The binary is a [nodejs sea application](https://nodejs.org/api/single-executable-applications.html), thus, a nodejs binary with the embeded source code in it. The releases are not signed, you can review the build script in [bin/build-sea.sh](bin/build-sea.sh) and build it yourself locally if you prefer (`npm run build:bin`). If you have any improvement advises for the binary releases, please post to issues.

## Running

Params to specify: source directory (`-s`), build directory (`-d`), optionally includes directory (`-i`), optionally path to zip file (`-z`). Example:

```bash
mockup-compiler -s ./src-dir -d ./dest-dir -i ./static-assets -z ./build.zip
```

See also `mockup-compiler --help` for the full list of options. Also, check the [file config section](#config) below.

## Watch mode

The tool can also be run in the **watch mode**. In this case runs complete build first and then starts watching the source files - if changed, runs conversion on the changed one again and re-bundles them (if requested)

```bash
mockup-compiler ... --watch
```

## Config

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

Invoice with:

```bash
mockup-compiler -c ./my-mock-config.json
```

- All params are optional except source and destination dirs.
- Params starting from `#` are ignored (this is more for testing and temp settings)
- **Important**: the paths are calculated relative to current work directory unless given as absolute paths.
- If `bundlePath` is not specified, zip/text bundle file will not be created, just tab-delimited texts.
- `eol` - defines which end-of-line character to use: linux style (LF) or window style (CRLF). *We recommend LF* which is aldo the default.
- `includes` - optionally defines a dir to directly copy files from, in addition to excel processing. *Currently support only one include dir*.
- `withMeta` instructs the compiler to create `.meta/src_files` with SHA1 hashes of source files (for integrity and compatibility with abap version of the tool)
- `cleanDestDirOnStart` deletes the destination dir before file processing. Importantly, it does not cleans the dir in watch mode, so changes are written on top of the existing files structure. Thus, e.g., deleting a sheet in excel will **not** delete it's already compiled representation - this can lead to rare subtle bugs - just restart the watcher ... ;).
- `skipFieldsStartingWith` - skips fields which start from the given symbol, by default it is `'-'`
- **CHANGED** since v1.2.0: `bundleFormat` - defines the format of the budle file:
  - `zip` (the default, if empty)
  - `text` (see [doc/text-bundle-format.md](doc/text-bundle-format.md))
  - `text+zip` - creates a text bundle and then zips it (decreases travel time to abap backend, use when the bundle becomes large and slow)
- `pattern` - is a glob pattern for Excel files. By default it is "*.xlsx", however the tool support all formats which are supported by the underlying library [sheetjs](https://www.npmjs.com/package/xlsx). The param can be a string or an array, e.g. `["*.xlsx", "*.xml"]`.
- `inMemory` - don't create mocks on the disk (in `destDir`), instead stash them in memory and write only the bundle file. Beware of potential memory usage if the data volume is large.
