# Bundling in text format

Since v1.2.0 the mockup compiler supports budling in text format. The motivation is to enable readability and "diff-ability" for git repositories.

## Important notes

- files are sorted by relative path before bundling, to keep the order predictable
- include should be in utf-8 enconding (other encoding are not tested and, anyway, mocks are utf-8 and mixing encoding is not a good idea)

## Format

Metadata marks are lines that start with `!!`. The expectation is that abap fields do not start with `!` symbol, thus it should be safe for the majority of cases. Includes cannot not be controlled, obviously. The file structure is:

```text
!!MOCKUP-LOADER-FORMAT <VERSION>
!!FILE-COUNT <N>
  ... other metadata before first !!FILE
  ... maybe TOC in future?
!!FILE <FILENAME> <TYPE> <LINES>
<FILEDATA>
  ... empty lines before the next FILE are ignored
```

- The header:
  - The file start from `MOCKUP-LOADER-FORMAT` tag, followed by version. Currently, the version is `1.0`.
  - Then `FILE-COUNT` tag follows describing the count of files for a basic integrity check.
  - The header is followed by other metadata or optional free comments before the first `FILE`.
- Files:
  - Each file is marked with `FILE` tag, followed by relative filename (`FILENAME`) in lowercase, `TYPE` of the content - currently `text` only (but potentially `base64` in the future) and number of following text `LINES` with the data.
  - Then the `LINES` lines of file content follow (`FILEDATA`).
  - The file block may be optionally followed by empty lines (for human readability) - they are ignored.

### Example

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
