const FileProcessor = require('../file-processor');
const fs = require('fs');

jest.mock('xlsx', () => ({
    read: () => ({
        SheetNames: ['Sheet1'],
        Sheets: {
            'Sheet1': {
                '!ref': 'A1:B4',
                'A1': { 't': 's', 'v': '#Notes', 'r': '<t>#Notes</t>', 'h': '#Notes', 'w': '#Notes' },
                'A2': { 't': 's', 'v': 'A',     'r': '<t>A</t>', 'h': 'A', 'w': 'A' },
                'A3': { 't': 's', 'v': 'Vasya', 'r': '<t>Vasya</t>', 'h': 'Vasya', 'w': 'Vasya' },
                'A4': { 't': 's', 'v': 'Petya', 'r': '<t>Petya</t>', 'h': 'Petya', 'w': 'Petya' },
                'B2': { 't': 's', 'v': 'B',     'r': '<t>B</t>', 'h': 'B', 'w': 'B' },
                'B3': { 't': 'n', 'v': 43344,   'w': '9/1/18' },
                'B4': { 't': 'n', 'v': 43345,   'w': '9/2/18' },
            }
        },
    }),
}));

jest.mock('../parse-workbook', () =>({
    parseWorkbook: () => ({
        sheet1: Object.assign([
            { A: 'Vasya', B: '01.09.2018' },
            { A: 'Petya', B: '02.09.2018' },
        ], { __columns__: ['A', 'B'] }),
    }),
}));

jest.mock('fs', () => {
    let files = {};
    const unifyFilename = (fn) => fn.replace(/\\/g, '/');
    return {
        existsSync: () => true,
        mkdirSync: () => {},
        readFile: (_f, _b, _cb) => { _cb() },
        writeFile: (file, data, _enc, _cb) => {
            files[unifyFilename(file)] = data;
            _cb();
        },

        _setFileContent: (x) => { files = x },
        _getFileContent: () => files,
    };
});

test('should process files', async () => {
    const fp = new FileProcessor('/tmp', 'lf');
    await fp.processFile('/tmp/test.xlsx');
    expect(fs._getFileContent()).toEqual({
        '/tmp/test/sheet1.txt': 'A\tB\nVasya\t01.09.2018\nPetya\t02.09.2018'
    });
});
