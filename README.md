# Mockup compiler for node js

Converts set of excels in a given directory to a set of tab-delimited text-files and zip them. Generally intended for [ABAP Mockup loader](https://github.com/sbcgua/mockup_loader) and as a faster alternative of [ABAP Mockup compiler](https://github.com/sbcgua/mockup_compiler) but probably can be used elsewhere. 

## How it works

1. Finds all `*.xlsx` in the given directory.
2. In each file, searches for `_contents` sheet with 2 columns. The first is a name of another sheet in the workbook, the second includes the sheet into conversion if not empty. See example `test.xlsx` in the repo root. If `_contents` **not found** all sheets will be converted.
3. All the listed sheets are converted into tab-delimited text files in UTF8.
    - each sheet should contain data, staring in A1 cell
    - `_` prefixed columns at the beginning are ignored, can be used for some meta data
    - columns after the first empty columns are ignored
    - rows after the first empty rows are ignored
4. All the files are saved to the given destination folder...
5. ... and optionally zipped into archive
6. The file path in the zip will be `<excel name uppercased>/<sheet name>.txt`
7. If specified, files from `includes` directory explicitly added too

## Install

```
npm install -g mockup-compiler-js
```

## Running

Params to specify: source directory, build directory, optionally include directory, optionally path to zip file. Run `mockup-compiler --help` for command line opts help. Example:

```
mockup-compiler -s ./src-dir -d ./dest-dir -i ./static-assets -z ./build.zip
```

Can also be run in the **watch mode**. In this case runs complete build first and then starts watching the source files - if changed, runs conversion on the changed one again and re-archives (if requested)

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
    ]
}
```
```
mockup-compiler -c ./my-mock-config.json
```
**Important**: the paths are calculated relative to current work directory (or can be also given as absolute paths).

If `zipPath` is not specified, zip file will not be created, just tab-delimited texts.
