const MetaCalculator = require('../meta');

test('should calculate meta', () => {
    const m = new MetaCalculator({
        excelFileManager: {
            fileHashMap: new Map([
                ['file1', 'hash1'],
                ['file2', 'hash2'],
            ]),
        },
        eolChar: 'lf',
    });
    expect(m.getSrcFilesMeta()).toBe([
        ['type\tsrc_file\ttimestamp\tsha1'],
        ['X\tfile1\t\thash1'],
        ['X\tfile2\t\thash2'],
    ].join('\n'));
});

test('should calculate meta with includes', () => {
    const m = new MetaCalculator({
        excelFileManager: {
            fileHashMap: new Map([
                ['file1', 'hash1'],
                ['file2', 'hash2'],
            ]),
        },
        includeFileManager: {
            fileHashMap: new Map([
                ['abcFile', 'hashAbc'],
            ]),
        },
        eolChar: 'lf',
    });
    expect(m.getSrcFilesMeta()).toBe([
        ['type\tsrc_file\ttimestamp\tsha1'],
        ['I\tabcFile\t\thashAbc'],
        ['X\tfile1\t\thash1'],
        ['X\tfile2\t\thash2'],
    ].join('\n'));
});
