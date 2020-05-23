const deepFreeze = require('deep-freeze');
const { parseExcelIntoMocks, createMockProcessor } = require('../mock-processings');

jest.mock('xlsx', () => ({
    read: jest.fn(),
}));

jest.mock('../workbook-parser', () => {
    let parseWorkbookResult = null;
    return {
        _setParseWorkbookResult: (result) => { parseWorkbookResult = result },
        parseWorkbook: () => parseWorkbookResult,
    };
});

test('should parseExcelIntoMocks', () => {
    const xlsx = require('xlsx');
    const { _setParseWorkbookResult } = require('../workbook-parser');

    const expMocks = deepFreeze({
        sheet1: Object.assign([
            { A: 'Vasya', B: '01.09.2018' },
            { A: 'Petya', B: '02.09.2018' },
        ], { __columns__: ['A', 'B'] }),
    });
    _setParseWorkbookResult(expMocks);
    const mocks = parseExcelIntoMocks('somedata');
    expect(xlsx.read.mock.calls).toEqual([ ['somedata', {type: 'binary'}] ]);
    expect(mocks).toEqual(expMocks);
});

test('should createMockProcessor', async () => {
    const fp = createMockProcessor('lf');
    const input = Object.assign([
        { A: 'Vasya', B: '01.09.2018' },
        { A: 'Petya', B: '02.09.2018' },
    ], { __columns__: ['A', 'B'] });

    expect(fp(input)).toEqual({
        data: 'A\tB\nVasya\t01.09.2018\nPetya\t02.09.2018',
        rowCount: 2,
    });
});
