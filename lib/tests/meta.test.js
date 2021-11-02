const MetaCalculator = require('../meta');

jest.mock('fs', () => require('memfs').fs);
const { vol } = require('memfs');

beforeEach(() => {
    vol.reset();
    vol.fromJSON({
        '/dest': null,
    });
});

test('should calculate meta', () => {
    const m = new MetaCalculator({
        excelFileManager: {
            fileHashMap: new Map([
                ['file1', 'hash1'],
                ['file2', 'hash2'],
            ]),
        },
        eol: 'lf',
        destDir: '/dest',
    });
    const expMeta = [
        ['type\tsrc_file\ttimestamp\tsha1'],
        ['X\tfile1\t\thash1'],
        ['X\tfile2\t\thash2'],
    ].join('\n');
    m.buildAndSave();
    expect(vol.toJSON()).toEqual({
        '/dest/.meta/src_files': expMeta,
    });
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
        eol: 'lf',
        destDir: '/dest',
    });
    const expMeta = [
        ['type\tsrc_file\ttimestamp\tsha1'],
        ['I\tabcFile\t\thashAbc'],
        ['X\tfile1\t\thash1'],
        ['X\tfile2\t\thash2'],
    ].join('\n');
    m.buildAndSave();
    expect(vol.toJSON()).toEqual({
        '/dest/.meta/src_files': expMeta,
    });
});

test('should getters', () => {
    const m = new MetaCalculator({
        excelFileManager: {},
        eol: 'lf',
        destDir: '/dest',
    });
    expect(m.metaDirName).toBe('.meta');
    expect(m.metaSrcFileName).toBe('.meta/src_files');
});