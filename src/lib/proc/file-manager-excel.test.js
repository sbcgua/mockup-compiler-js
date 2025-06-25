import ExcelFileManager from './file-manager-excel.js';
import { vol } from 'memfs';
import { vi, test, expect, describe, beforeEach } from 'vitest';

vi.mock('node:fs', async () => {
    const memfs = await vi.importActual('memfs');
    return { default: memfs.fs, ...memfs.fs };
});

vi.mock('node:fs/promises', async () => {
    const memfs = await vi.importActual('memfs');
    return { default: memfs.fs.promises, ...memfs.fs.promises };
});

vi.mock('xlsx', () => ({ read: blob => blob }));

// import { readdirSync } from 'node:fs';
// import { readFile } from 'node:fs/promises';
// import { read } from 'xlsx';

describe('ExcelFileManager', () => {

    // test('dummy', async () => {
    //     vol.fromJSON({
    //         '/mocks/source1.xlsx': 'excelblob1',
    //         '/mocks/source2.xlsx': 'excelblob2',
    //         '/dest': null, // dir
    //     });
    //     console.log(readdirSync('/'));
    //     console.log(await readFile('/mocks/source1.xlsx', 'utf8'));
    //     console.log(read('/mocks/source1.xlsx'));
    // });

    beforeEach(() => {
        vol.reset();
    });

    function createMockExtractor() {
        // receive excel "signature", return "data" of sheets
        const mocks = new Map([
            ['excelblob1', {
                mock1: {data: 'a'},
                mock2: {data: 'b'},
            }],
            ['excelblob2', {
                mock3: {data: 'c'},
            }],
            ['excelblob3', {
                mock3: {data: 'c'},
                mock4: {data: 'd'},
            }],
        ]);
        return vi.fn(blob => mocks.get(blob));
    }

    function createMockProcessor() {
        // receive "data" of sheet, return {"converted" data, rowCount}
        let mockNum = 0;
        return vi.fn(mockData => ({
            data: mockData.data + 'DATA',
            rowCount: ++mockNum,
        }));
    }

    function createInstance(overloads = null) {
        const mockExtractor = createMockExtractor();
        const mockProcessor = createMockProcessor();
        const fm = new ExcelFileManager({
            srcDir: '/mocks',
            destDir: '/dest',
            mockExtractor,
            mockProcessor,
            ...overloads,
        });
        return { mockExtractor, mockProcessor, fm };
    }

    test('should process dir (happy path)', async () => {
        vol.fromJSON({
            '/mocks/source1.xlsx': 'excelblob1',
            '/mocks/source2.xlsx': 'excelblob2',
            '/dest': null, // dir
        });
        const { mockExtractor, mockProcessor, fm } = createInstance();

        await fm.processAll();

        expect(mockExtractor.mock.calls).toEqual([
            [ 'excelblob1' ],
            [ 'excelblob2' ],
        ]);
        expect(mockProcessor.mock.calls).toEqual([
            [ {data: 'a'} ],
            [ {data: 'b'} ],
            [ {data: 'c'} ],
        ]);
        expect(fm.testObjectList).toEqual([
            'source1/mock1.txt',
            'source1/mock2.txt',
            'source2/mock3.txt',
        ]);
        expect([...fm.fileHashMap.entries()]).toEqual([
            ['source1.xlsx', undefined],
            ['source2.xlsx', undefined],
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
        const { mockExtractor, mockProcessor, fm } = createInstance({ withHashing: true });

        await fm.processAll();

        expect(mockExtractor.mock.calls).toEqual([
            [ 'excelblob1' ],
            [ 'excelblob2' ],
        ]);
        expect(mockProcessor.mock.calls).toEqual([
            [ {data: 'a'} ],
            [ {data: 'b'} ],
            [ {data: 'c'} ],
        ]);
        expect(fm.testObjectList).toEqual([
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
        const { fm } = createInstance();

        const onStart = vi.fn();
        const onMock = vi.fn();
        fm.on('start-of-file-processing', onStart);
        fm.on('item-processed', onMock);
        await fm.processAll();

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
        const { mockExtractor, mockProcessor, fm } = createInstance();

        await fm.processAll();
        vol.writeFileSync('/mocks/source2.xlsx', 'excelblob3');
        mockExtractor.mockClear();
        mockProcessor.mockClear();
        await fm.processOneFile('/mocks/source2.xlsx');

        expect(mockExtractor.mock.calls).toEqual([
            [ 'excelblob3' ],
        ]);
        expect(mockProcessor.mock.calls).toEqual([
            [ {data: 'c'} ],
            [ {data: 'd'} ],
        ]);
        expect(fm.testObjectList).toEqual([
            'source1/mock1.txt',
            'source1/mock2.txt',
            'source2/mock3.txt',
            'source2/mock4.txt',
        ]);
        expect([...fm.fileHashMap.entries()]).toEqual([
            ['source1.xlsx', undefined],
            ['source2.xlsx', undefined],
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
        const { mockExtractor, mockProcessor, fm } = createInstance({ withHashing: true });

        await fm.processAll();
        vol.writeFileSync('/mocks/source2.xlsx', 'excelblob3');
        mockExtractor.mockClear();
        mockProcessor.mockClear();
        await fm.processOneFile('/mocks/source2.xlsx');

        expect(mockExtractor.mock.calls).toEqual([
            [ 'excelblob3' ],
        ]);
        expect(mockProcessor.mock.calls).toEqual([
            [ {data: 'c'} ],
            [ {data: 'd'} ],
        ]);
        expect(fm.testObjectList).toEqual([
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
        const { fm } = createInstance();

        // await fm.processAll();
        await expect(fm.processOneFile('/another/source3.xlsx')).rejects.toThrowError('from another directory');
    });

    test('should fail on wrong params', () => {
        const initiationFn = () => createInstance();

        expect(initiationFn).toThrowError('Source dir');
        vol.mkdirSync('/mocks');
        expect(initiationFn).toThrowError('Destination dir');
        vol.mkdirSync('/dest');
        expect(initiationFn).not.toThrowError();
    });

});