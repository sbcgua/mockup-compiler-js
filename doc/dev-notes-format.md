# Bundling in text format

Since v1.2.0 the mockup compiler supports budling in text format. The motivation is to enable readability and "diff-ability" for git repositories.

## Important notes

- files are sorted by relaive path before bundling, to keep the order predictable
- include should be in utf-8 enconding (other encoding are not tested and, anyway, mocks are utf-8 and mixing encoding is not a good idea)

## Format

Metadata marks are lines that start with `!!`. The idea is that abap fields do not start with ! symbol, thus it should be safe for the majority of cases. Includes cannot not be controlled, obviously.

```text
!!MOCKUP-LOADER-FORMAT <VERSION>
!!FILE-COUNT <N>
  ... other metadata before first !!FILE
  ... maybe TOC in future?
!!FILE <FILENAME> <TYPE> <LINES>
<FILEDATA>
  ... empty lines before the next FILE are ignored
```

- The file start from `MOCKUP-LOADER-FORMAT` tag, followed by version. Currently, the version is `1.0`.
- The header is followed by other metadata or optional free comments.
- `FILE-COUNT` tag describes the count of files for a basic integrity check
- Each file is marked with `FILE` tag, followed by relative filename (`FILENAME`) in lowercase, `TYPE` of the content - currently `text` only (but potentially `base64` in the future, may be still withing v1.0 format) and number of following text `LINES` with the data.
- Then the `LINES` lines of file content follow.
- The file block may be optionally followed by empty lines (for human readability) - this portion is ignored.

### Examples

```text
!!MOCKUP-LOADER-FORMAT 1.0
!!FILE-COUNT 2
some comments or future metadata

!!FILE /test1/t001.txt text 2
BUKRS NAME1
0101 Company1
0102 Company2

!!FILE /test1/bkpf.txt text 2
BELNR BUKRS
1000001 0101
1000002 0101
```
