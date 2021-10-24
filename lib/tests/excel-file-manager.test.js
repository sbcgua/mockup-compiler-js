const ExcelFileManager = require('../excel-file-manager');

/**
 * TODO
 * + dir processing
 * + dir processing w hash
 * + move to memfs
 * + emits
 * + one file processing
 * + one file processing w hash update
 * params validation
 * wrong file from another dir
 */

jest.mock('fs', () => require('memfs').fs);
const { vol } = require('memfs');

beforeEach(() => {
    vol.reset();
});

function createMockProcessor() {
    let mockNum = 0;
    return jest.fn(mockData => ({
        data: mockData + 'DATA',
        rowCount: ++mockNum,
    }));
}

function createFileParser() {
    const mocks = new Map([
        ['excelblob1', {
            mock1: 'a',
            mock2: 'b',
        }],
        ['excelblob2', {
            mock3: 'c',
        }],
        ['excelblob3', {
            mock3: 'c',
            mock4: 'd',
        }],
    ]);
    return jest.fn(blob => mocks.get(blob));
}

test('should process dir (happy path)', async () => {
    vol.fromJSON({
        '/mocks/source1.xlsx': 'excelblob1',
        '/mocks/source2.xlsx': 'excelblob2',
        '/dest': null, // dir
    });
    const fileParser = createFileParser();
    const mockProcessor = createMockProcessor();
    const fm = new ExcelFileManager({
        srcDir: '/mocks',
        destDir: '/dest',
        fileParser,
        mockProcessor,
    });

    await fm.processDir();

    expect(fileParser.mock.calls).toEqual([
        [ 'excelblob1' ],
        [ 'excelblob2' ],
    ]);
    expect(mockProcessor.mock.calls).toEqual([
        [ 'a' ],
        [ 'b' ],
        [ 'c' ],
    ]);
    expect(fm.mockList).toEqual([
        'source1/mock1.txt',
        'source1/mock2.txt',
        'source2/mock3.txt',
    ]);
    expect([...fm.fileHashMap.entries()]).toEqual([
        ['source1.xlsx', null],
        ['source2.xlsx', null],
    ]);
    expect(vol.toJSON()).toEqual({
        '/mocks/source1.xlsx': 'excelblob1',
        '/mocks/source2.xlsx': 'excelblob2',
        '/dest/source1/mock1.txt': 'aDATA',
        '/dest/source1/mock2.txt': 'bDATA',
        '/dest/source2/mock3.txt': 'cDATA',
    });
});

test('should process dir with Hashing', async () => {
    vol.fromJSON({
        '/mocks/source1.xlsx': 'excelblob1',
        '/mocks/source2.xlsx': 'excelblob2',
        '/dest': null, // dir
    });
    const fileParser = createFileParser();
    const mockProcessor = createMockProcessor();
    const fm = new ExcelFileManager({
        srcDir: '/mocks',
        destDir: '/dest',
        fileParser,
        mockProcessor,
        withHashing: true,
    });

    await fm.processDir();

    expect(fileParser.mock.calls).toEqual([
        [ 'excelblob1' ],
        [ 'excelblob2' ],
    ]);
    expect(mockProcessor.mock.calls).toEqual([
        [ 'a' ],
        [ 'b' ],
        [ 'c' ],
    ]);
    expect(fm.mockList).toEqual([
        'source1/mock1.txt',
        'source1/mock2.txt',
        'source2/mock3.txt',
    ]);
    expect([...fm.fileHashMap.entries()]).toEqual([
        ['source1.xlsx', 'a2a3bb940141a764e09f92fa0011063ae4ed0d31'],
        ['source2.xlsx', '4ec3b91ac2b025e71d0e870ce8f3d39e09bcb542'],
    ]);
    expect(vol.toJSON()).toEqual({
        '/mocks/source1.xlsx': 'excelblob1',
        '/mocks/source2.xlsx': 'excelblob2',
        '/dest/source1/mock1.txt': 'aDATA',
        '/dest/source1/mock2.txt': 'bDATA',
        '/dest/source2/mock3.txt': 'cDATA',
    });
});

test('should emit proper messages', async () => {
    vol.fromJSON({
        '/mocks/source1.xlsx': 'excelblob1',
        '/mocks/source2.xlsx': 'excelblob2',
        '/dest': null, // dir
    });
    const fileParser = createFileParser();
    const mockProcessor = createMockProcessor();
    const fm = new ExcelFileManager({
        srcDir: '/mocks',
        destDir: '/dest',
        fileParser,
        mockProcessor,
    });

    const onStart = jest.fn();
    const onMock = jest.fn();
    fm.on('start-of-file-processing', onStart);
    fm.on('mock-processed', onMock);
    await fm.processDir();

    expect(onStart.mock.calls).toEqual([
        [{ name: 'source1.xlsx'}],
        [{ name: 'source2.xlsx'}],
    ]);
    expect(onMock.mock.calls).toEqual([
        [{ name: 'mock1.txt', rowCount: 1 }],
        [{ name: 'mock2.txt', rowCount: 2 }],
        [{ name: 'mock3.txt', rowCount: 3 }],
    ]);
});

test('should process one file', async () => {
    vol.fromJSON({
        '/mocks/source1.xlsx': 'excelblob1',
        '/mocks/source2.xlsx': 'excelblob2',
        '/dest': null, // dir
    });
    const fileParser = createFileParser();
    const mockProcessor = createMockProcessor();
    const fm = new ExcelFileManager({
        srcDir: '/mocks',
        destDir: '/dest',
        fileParser,
        mockProcessor,
    });

    await fm.processDir();
    vol.writeFileSync('/mocks/source2.xlsx', 'excelblob3');
    fileParser.mockClear();
    mockProcessor.mockClear();
    await fm.processOneFile('/mocks/source2.xlsx');

    expect(fileParser.mock.calls).toEqual([
        [ 'excelblob3' ],
    ]);
    expect(mockProcessor.mock.calls).toEqual([
        [ 'c' ],
        [ 'd' ],
    ]);
    expect(fm.mockList).toEqual([
        'source1/mock1.txt',
        'source1/mock2.txt',
        'source2/mock3.txt',
        'source2/mock4.txt',
    ]);
    expect([...fm.fileHashMap.entries()]).toEqual([
        ['source1.xlsx', null],
        ['source2.xlsx', null],
    ]);
    expect(vol.toJSON()).toEqual({
        '/mocks/source1.xlsx': 'excelblob1',
        '/mocks/source2.xlsx': 'excelblob3',
        '/dest/source1/mock1.txt': 'aDATA',
        '/dest/source1/mock2.txt': 'bDATA',
        '/dest/source2/mock3.txt': 'cDATA',
        '/dest/source2/mock4.txt': 'dDATA',
    });
});

test('should process one file with Hashing', async () => {
    vol.fromJSON({
        '/mocks/source1.xlsx': 'excelblob1',
        '/mocks/source2.xlsx': 'excelblob2',
        '/dest': null, // dir
    });
    const fileParser = createFileParser();
    const mockProcessor = createMockProcessor();
    const fm = new ExcelFileManager({
        srcDir: '/mocks',
        destDir: '/dest',
        fileParser,
        mockProcessor,
        withHashing: true,
    });

    await fm.processDir();
    vol.writeFileSync('/mocks/source2.xlsx', 'excelblob3');
    fileParser.mockClear();
    mockProcessor.mockClear();
    await fm.processOneFile('/mocks/source2.xlsx');

    expect(fileParser.mock.calls).toEqual([
        [ 'excelblob3' ],
    ]);
    expect(mockProcessor.mock.calls).toEqual([
        [ 'c' ],
        [ 'd' ],
    ]);
    expect(fm.mockList).toEqual([
        'source1/mock1.txt',
        'source1/mock2.txt',
        'source2/mock3.txt',
        'source2/mock4.txt',
    ]);
    expect([...fm.fileHashMap.entries()]).toEqual([
        ['source1.xlsx', 'a2a3bb940141a764e09f92fa0011063ae4ed0d31'],
        ['source2.xlsx', 'c0f471714bec4543c45cfa75955b0a765a6b4f89'],
    ]);
    expect(vol.toJSON()).toEqual({
        '/mocks/source1.xlsx': 'excelblob1',
        '/mocks/source2.xlsx': 'excelblob3',
        '/dest/source1/mock1.txt': 'aDATA',
        '/dest/source1/mock2.txt': 'bDATA',
        '/dest/source2/mock3.txt': 'cDATA',
        '/dest/source2/mock4.txt': 'dDATA',
    });
});

test('should fail on file from another dir', async () => {
    vol.fromJSON({
        '/mocks/source1.xlsx': 'excelblob1',
        '/mocks/source2.xlsx': 'excelblob2',
        '/another/source3.xlsx': 'excelblob2',
        '/dest': null, // dir
    });
    const fm = new ExcelFileManager({
        srcDir: '/mocks',
        destDir: '/dest',
        fileParser: createFileParser(),
        mockProcessor: createMockProcessor(),
        withHashing: true,
    });

    // await fm.processDir();
    await expect(fm.processOneFile('/another/source3.xlsx')).rejects.toThrowError('from another directory');
});

test('should fail on wrong params', () => {
    const initiationFn = () => new ExcelFileManager({
        srcDir: '/mocks',
        destDir: '/dest',
        fileParser: createFileParser(),
        mockProcessor: createMockProcessor(),
    });

    expect(initiationFn).toThrowError('Source dir');
    vol.mkdirSync('/mocks');
    expect(initiationFn).toThrowError('Destination dir');
    vol.mkdirSync('/dest');
    expect(initiationFn).not.toThrowError();
});
