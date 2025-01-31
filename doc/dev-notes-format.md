

    - utf8 only
    - force sorting (how? xl[+mocks], includes(with path))

!!MOCKUP-LOADER-FORMAT 1.0
!!TOC
/xyz/123.txt 5
/xyz/234.txt 9
!!TOC-END
!!FILE /xyz/123.txt
!Comment line (but this is the file data already)
FIELD1 FIELD2 ...
VAL1 VAL2 ...
!!FILE-HEAD /xyz/234.txt LINES
!!FILE-HEAD-END
...
Or maybe caching? !!FILE-HEAD

!!MOCKUP-LOADER-FORMAT 1.0
... other metadata before first !!FILE
... maybe TOC?
!!FILE /xyz/234.txt TYPE LINES (lines = 0 is an error?)
  TYPE - text or mime64
  LINES - NUMBER
... other !! metadata before first data line
data:[LINE lines]
