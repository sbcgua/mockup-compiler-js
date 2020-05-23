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
            const events = {};
            const stream = {
                on: (event, fn) => { events[event] = fn },
                end: (data) => {
                    files[unifyFilename(destPath)] = data;
                    const onFinish = events['finish'];
                    if (onFinish) onFinish();
                },
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
    const parserMock = jest.fn(() => ({
        mock1: 'a',
        mock2: 'b',
    }));
    let mockNum = 0;
    const processorMock = jest.fn(mockData => ({
        data: mockData + 'DATA',
        rowCount: ++mockNum,
    }));
    const onMock = jest.fn();

    fs._setFileContent(files);
    const fp = new FilePipeline({
        destRoot: '/tmp',
        fileParser: parserMock,
        mockProcessor: processorMock,
    });
    fp.on('mock-processed', onMock);

    const mockList = await fp.processFile('source.xlsx');

    expect(mockList).toEqual([
        'source/mock1.txt',
        'source/mock2.txt',
    ]);
    expect(parserMock.mock.calls).toEqual([
        [ 'abc' ],
    ]);
    expect(processorMock.mock.calls).toEqual([
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
