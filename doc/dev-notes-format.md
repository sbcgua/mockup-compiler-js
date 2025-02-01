# Bundling in text format

Since v1.2.0 the mockup compiler supports budling in text format. The motivation is to enable readability and "diffability" for git repositories.

## Important notes

- files are sorted by relaive path before bundling, to keep the order predictable
- include should be in utf-8 enconding (other encoding are not tested and, anyway, mocks are utf-8 and mixing encoding is not a good idea)

## Format

Metadata marks are lines that start with `!!`. The idea is that abap fields do not start with ! symbol, thus it should be safe for the majority of cases. Includes cannot not be controlled, obviously.

```text
!!MOCKUP-LOADER-FORMAT <1.0>
  ... other metadata before first !!FILE
  ... maybe TOC in future?
!!FILE <FILENAME> <TYPE> <LINES>
  ... other !! metadata before first data line - reserved for future compatibility
<FILEDATA>
  ... empty lines before the next FILE are ignored
```

- The file start from `MOCKUP-LOADER-FORMAT` tag, followed by version. Currently, the version is `1.0`.
- The header is optionally followed by other metadata or comments. So all lines not starting from !!FILE are ignored.
- Each file is marked with `FILE` tag, followed by relative filename (`FILENAME`) in lowercase, `TYPE` of the content - currently `text` only (but potentially `base64` in future) and number of following text `LINES` with the data.
- The `FILE` tag is optionally followed by other metadata lines, starting from `!!` (reserved for future compatibility)
- Then the `LINES` lines of file content follow.
- The file block may be optionally followed by empty lines (for human readability) - this portion is ignored.

### Examples

```text
!!MOCKUP-LOADER-FORMAT <1.0>

!!FILE /test1/t001.txt text 2
BUKRS NAME1
0101 Company1
0102 Company2

!!FILE /test1/bkpf.txt text 2
BELNR BUKRS
1000001 0101
1000002 0101
```

```text
!!MOCKUP-LOADER-FORMAT <1.0>
some comments or future metadata

!!FILE /test1/t001.txt text 2
!!FILE-EXTRAS some metadata of future format versions
BUKRS NAME1
0101 Company1
0102 Company2

!!FILE /test1/bkpf.txt text 2
BELNR BUKRS
1000001 0101
1000002 0101
```
