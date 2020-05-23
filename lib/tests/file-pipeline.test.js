const fs = require('fs');
jest.mock('fs', () => {
    let files = {};
    const unifyFilename = (fn) => fn.replace(/\\/g, '/');
    return {
        existsSync: () => true,
        mkdirSync: () => {},
        readFile: (file, _b, _cb) => { _cb(null, files[file]) },
        writeFile: (file, data, _enc, _cb) => {
            files[unifyFilename(file)] = data;
            _cb();
        },
        createWriteStream: destPath => {
            destPath = unifyFilename(destPath);
            const events = {};
            const stream = {
                on: (event, fn) => { events[event] = fn },
                end: (data) => {
                    if (!data) data = '';
                    files[destPath] = files[destPath] ? files[destPath] + data : data;
                    events['finish'] && events['finish']();
                },
                write: (data) => {
                    if (!data) data = '';
                    files[destPath] = files[destPath] ? files[destPath] + data : data;
                },
                once: () => {}, //console.log(...args),
                emit: () => {}, //console.log(...args),
            };
            return stream;
        },

        _setFileContent: (x) => { files = x },
        _getFileContent: () => files,
    };
});
const FilePipeline = require('../file-pipeline');


test('should process files', async () => {
    const files = {
        'source.xlsx': 'abc',
    };
    const fileParser = jest.fn(() => ({
        mock1: 'a',
        mock2: 'b',
    }));
    let mockNum = 0;
    const mockProcessor = jest.fn(mockData => ({
        data: mockData + 'DATA',
        rowCount: ++mockNum,
    }));
    const onMock = jest.fn();

    fs._setFileContent(files);
    const fp = new FilePipeline({
        destRoot: '/tmp',
        fileParser,
        mockProcessor,
    });
    fp.on('mock-processed', onMock);

    const mockList = await fp.processFile('source.xlsx');

    expect(mockList).toEqual({
        mockList: [
            'source/mock1.txt',
            'source/mock2.txt',
        ],
        sourceFileHash: 'a9993e364706816aba3e25717850c26c9cd0d89d',
    });
    expect(fileParser.mock.calls).toEqual([
        [ 'abc' ],
    ]);
    expect(mockProcessor.mock.calls).toEqual([
        [ 'a' ],
        [ 'b' ],
    ]);
    expect(onMock.mock.calls).toEqual([
        [ { name: 'mock1.txt', rowCount: 1 } ],
        [ { name: 'mock2.txt', rowCount: 2 } ],
    ]);
    expect(files).toEqual({
        'source.xlsx': 'abc',
        '/tmp/source/mock1.txt': 'aDATA',
        '/tmp/source/mock2.txt': 'bDATA',
    });
});
