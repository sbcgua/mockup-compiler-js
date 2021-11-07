[![Build Status](https://github.com/sbcgua/mockup-compiler-js/actions/workflows/main.yml/badge.svg)](https://github.com/sbcgua/mockup-compiler-js/actions/workflows/main.yml)
[![npm version](https://badge.fury.io/js/mockup-compiler-js.svg)](https://badge.fury.io/js/mockup-compiler-js)
[![Known Vulnerabilities](https://snyk.io/test/github/sbcgua/mockup-compiler-js/badge.svg?targetFile=package.json)](https://snyk.io/test/github/sbcgua/mockup-compiler-js?targetFile=package.json)

# Mockup compiler for node js

Converts set of excels in a given directory to a set of tab-delimited text-files and zip them. Generally intended for [ABAP Mockup loader](https://github.com/sbcgua/mockup_loader) and as a faster alternative of [ABAP Mockup compiler](https://github.com/sbcgua/mockup_compiler) or devops flows around mockup loader. 

## How it works

1. Finds all `*.xlsx` in the given directory.
2. In each file, find the sheets to convert:
    - **By default**, converts all sheets with names not starting with `'-'`.
    - But also: searches for `_contents` sheet with 2 columns. The first is a name of another sheet in the workbook, the second includes the sheet into conversion if not empty. See example `test.xlsx` in the `test-sample` dir. If found, listed sheets are converted.
    - If `_exclude` sheet is present, then the list of sheets in the first column (except the first line - column name) are excluded from processing. This happens on top of `_contents` sheet. See example `test.xlsx` in the `test-sample` dir.
3. All the listed sheets are converted into tab-delimited text files in UTF8.
    - each sheet should contain data, staring in A1 cell
    - if A1 contains `#` at the beginning this row is skipped (it is for comments) and the header is read from B1
    - `"-"` prefixed columns at the beginning are ignored, can be used for some meta data (you can also alter the character with `skipFieldsStartingWith` config param)
    - columns after the first empty columns are ignored
    - rows after the first empty rows are ignored
4. All the files are saved to the given destination folder...
5. ... and optionally zipped into archive (`zipPath` config param)
6. The file path in the zip will be `<excel name in lower case>/<sheet name>.txt`
7. If specified, files from `includes` directory explicitly added too
8. Optionally, `.meta` files are created (`withMeta` config param) with sha1 hashes of the source files

## Install

```
npm install -g mockup-compiler-js
```

## Running

Params to specify: source directory, build directory, optionally include directory, optionally path to zip file. Run `mockup-compiler --help` for command line opts help. Example:

```
mockup-compiler -s ./src-dir -d ./dest-dir -i ./static-assets -z ./build.zip
```

See also `mockup-compiler --help` for the full list of options.

## Watch mode

The tool can also be run in the **watch mode**. In this case runs complete build first and then starts watching the source files - if changed, runs conversion on the changed one again and re-archives (if requested)

```
mockup-compiler ... --watch
```

## Config

The setting can be given in config. By default the programs looks for the config in the current directory in file `.mock-config.json`. Optionally can be set with `-c` command opt. Example of the file:

```json
{
    "sourceDir": ".",
    "eol": "lf", // lf or crlf
    "destDir": "_dest",
    "zipPath": "_dest/build.zip",
    "includes": [
        "_dest/_inc"
    ],
    "skipFieldsStartingWith": "_",
    "withMeta": true,
    "cleanDestDirOnStart": false
}
```
All params are optional except source and destination dirs.
```
mockup-compiler -c ./my-mock-config.json
```
- **Important**: the paths are calculated relative to current work directory unless given as absolute paths.
- If `zipPath` is not specified, zip file will not be created, just tab-delimited texts.
- `eol` - defines which end-of-line character to use: linux style (LF) or window style (CRLF). We recommend LF.
- `includes` - optionally defines an dir to directly copy files from, in addition to excel processing. *Currently support only one include dir*.
- `withMeta` instructs the compiler to create `.meta/src_files` with SHA1 hashes of source files (for integrity and compatibility with abap version of the tool)
- `cleanDestDirOnStart` deletes the destination dir before file processing. Importantly, it does not cleans the dir in watch mode, so changes are written on top of the existing files structure. Thus, e.g., deleting a sheet in excel will **not** delete it's already compiled representation.
