import { sheetToJson } from './sheet-reader';

const MOCK = {
    '!ref': 'A1:D3',
    'A1': { 't': 's', 'v': 'A',     'r': '<t>A</t>', 'h': 'A', 'w': 'A' },
    'B1': { 't': 's', 'v': 'B',     'r': '<t>B</t>', 'h': 'B', 'w': 'B' },
    'C1': { 't': 's', 'v': 'C',     'r': '<t>C</t>', 'h': 'C', 'w': 'C' },
    'A2': { 't': 's', 'v': 'Vasya', 'r': '<t>Vasya</t>', 'h': 'Vasya', 'w': 'Vasya' },
    'B2': { 't': 'n', 'v': 43344,   'w': '9/1/18' },
    'C2': { 't': 'n', 'v': 15,      'w': '15.00' },
    'A3': { 't': 's', 'v': 'Petya', 'r': '<t>Petya</t>', 'h': 'Petya', 'w': 'Petya' },
    'B3': { 't': 'n', 'v': 43345,   'w': '9/2/18' },
    'C3': { 't': 'n', 'v': 16.37,   'w': '16.37' },
    'D1': { 't': 's', 'v': 'D',     'r': '<t>D</t>', 'h': 'D', 'w': 'D' },
    'D2': { 't': 'b', 'v': true,    'w': 'TRUE' },
    'D3': { 't': 'b', 'v': false,   'w': 'FALSE' },
};

test('basic test', () => {
    const act = sheetToJson(MOCK);
    expect(act).toEqual([
        { A: 'Vasya', B: new Date('2018-09-01T00:00:00.000Z'), C: 15, D: true },
        { A: 'Petya', B: new Date('2018-09-02T00:00:00.000Z'), C: 16.37, D: false },
    ]);
    expect(act.__columns__).toEqual(['A', 'B', 'C', 'D']);
});

test('renames', () => {
    const act = sheetToJson(MOCK, { renameMap: { 'A': 'X' } });
    expect(act).toEqual([
        { X: 'Vasya', B: new Date('2018-09-01T00:00:00.000Z'), C: 15, D: true },
        { X: 'Petya', B: new Date('2018-09-02T00:00:00.000Z'), C: 16.37, D: false },
    ]);
});

test('dateFormatter', () => {
    const act = sheetToJson(MOCK, { formatters: { date: (d) => d.toISOString().substr(0,10) } });
    expect(act).toEqual([
        { A: 'Vasya', B: '2018-09-01', C: 15, D: true },
        { A: 'Petya', B: '2018-09-02', C: 16.37, D: false },
    ]);
});

test('numberFormatter', () => {
    const act = sheetToJson(MOCK, { formatters: { number: (n) => n.toFixed(2) } });
    expect(act).toEqual([
        { A: 'Vasya', B: new Date('2018-09-01T00:00:00.000Z'), C: '15.00', D: true },
        { A: 'Petya', B: new Date('2018-09-02T00:00:00.000Z'), C: '16.37', D: false },
    ]);
});

test('numberFormatter 2', () => {
    const act = sheetToJson(MOCK, { formatters: { number: (n, w) => w } });
    expect(act).toEqual([
        { A: 'Vasya', B: new Date('2018-09-01T00:00:00.000Z'), C: '15.00', D: true },
        { A: 'Petya', B: new Date('2018-09-02T00:00:00.000Z'), C: '16.37', D: false },
    ]);
});

test('lowerCaseColumns', () => {
    const act = sheetToJson(MOCK, { lowerCaseColumns: true });
    expect(act).toEqual([
        { a: 'Vasya', b: new Date('2018-09-01T00:00:00.000Z'), c: 15, d: true },
        { a: 'Petya', b: new Date('2018-09-02T00:00:00.000Z'), c: 16.37, d: false },
    ]);
});

test('keep empty rows', () => {
    const MOCK = {
        '!ref': 'A1:B3',
        'A1': { 't': 's', 'v': 'A', 'r': '<t>A</t>', 'h': 'A', 'w': 'A' },
        'B1': { 't': 's', 'v': 'B', 'r': '<t>B</t>', 'h': 'B', 'w': 'B' },
        'A3': { 't': 's', 'v': 'C', 'r': '<t>C</t>', 'h': 'C', 'w': 'C' },
        'B3': { 't': 's', 'v': 'D', 'r': '<t>D</t>', 'h': 'D', 'w': 'D' },
    };
    let act = sheetToJson(MOCK, { });
    expect(act).toEqual([
        { A: 'C', B: 'D' },
    ]);

    act = sheetToJson(MOCK, { keepEmptyRows: true });
    expect(act).toEqual([
        { A: '',  B: '' },
        { A: 'C', B: 'D' },
    ]);
    expect(act[0].__isempty__).toBeTruthy();
    expect(act[1].__isempty__).toBeUndefined();
});

test('skip if first column empty', () => {
    const MOCK = {
        '!ref': 'A1:B5',
        'A1': { 't': 's', 'v': 'A', 'r': '<t>A</t>', 'h': 'A', 'w': 'A' },
        'B1': { 't': 's', 'v': 'B', 'r': '<t>B</t>', 'h': 'B', 'w': 'B' },
        'A2': { 't': 's', 'v': 'C', 'r': '<t>C</t>', 'h': 'C', 'w': 'C' },
        'B2': { 't': 's', 'v': 'D', 'r': '<t>D</t>', 'h': 'D', 'w': 'D' },
        'A4': { 't': 's', 'v': 'Y', 'r': '<t>Y</t>', 'h': 'Y', 'w': 'Y' },
        'B3': { 't': 's', 'v': 'X', 'r': '<t>X</t>', 'h': 'X', 'w': 'X' }, // empty first col
        'A5': { 't': 's', 'v': '', 'r': '', 'h': '', 'w': '' }, // empty first col
        'B5': { 't': 's', 'v': 'Z', 'r': '<t>Z</t>', 'h': 'Z', 'w': 'Z' }, // empty first col
    };
    let act = sheetToJson(MOCK, { });
    expect(act).toEqual([
        { A: 'C', B: 'D' },
        { A: '',  B: 'X' },
        { A: 'Y',  B: '' },
        { A: '',  B: 'Z' },
    ]);

    act = sheetToJson(MOCK, { skipIfFirstColumnEmpty: true });
    expect(act).toEqual([
        { A: 'C', B: 'D' },
        { A: 'Y',  B: '' },
    ]);
});

test('skip first row with comment', () => {
    const MOCK = {
        '!ref': 'A1:B3',
        'A1': { 't': 's', 'v': '#A', 'r': '<t>#A</t>', 'h': '#A', 'w': '#A' },
        'A2': { 't': 's', 'v': 'C', 'r': '<t>C</t>', 'h': 'C', 'w': 'C' },
        'A3': { 't': 's', 'v': 'Y', 'r': '<t>Y</t>', 'h': 'Y', 'w': 'Y' },
        'B1': { 't': 's', 'v': 'B', 'r': '<t>B</t>', 'h': 'B', 'w': 'B' },
        'B2': { 't': 's', 'v': 'D', 'r': '<t>D</t>', 'h': 'D', 'w': 'D' },
        'B3': { 't': 's', 'v': 'X', 'r': '<t>X</t>', 'h': 'X', 'w': 'X' },
    };
    const act = sheetToJson(MOCK, { firstRowCommentChar: '#' });
    expect(act).toEqual([
        { C: 'Y', D: 'X' },
    ]);
});

test('trim on empty header', () => {
    const MOCK = {
        '!ref': 'A1:C3',
        'A1': { 't': 's', 'v': 'A', 'r': '<t>A</t>', 'h': 'A', 'w': 'A' },
        'B1': { 't': 's', 'v': 'B', 'r': '<t>B</t>', 'h': 'B', 'w': 'B' },
        'C1': { 't': 's', 'v': '', 'r': '', 'h': '', 'w': '' },

        'A2': { 't': 's', 'v': 'C', 'r': '<t>C</t>', 'h': 'C', 'w': 'C' },
        'B2': { 't': 's', 'v': 'D', 'r': '<t>D</t>', 'h': 'D', 'w': 'D' },
        'C2': { 't': 's', 'v': 'E', 'r': '<t>E</t>', 'h': 'E', 'w': 'E' },

        'A3': { 't': 's', 'v': 'Y', 'r': '<t>Y</t>', 'h': 'Y', 'w': 'Y' },
        'B3': { 't': 's', 'v': 'X', 'r': '<t>X</t>', 'h': 'X', 'w': 'X' },
    };
    let act = sheetToJson(MOCK, { });
    expect(act).toEqual([
        { A: 'C', B: 'D', '': 'E' },
        { A: 'Y',  B: 'X', '': '' },
    ]);

    act = sheetToJson(MOCK, { trimOnEmptyHeader: true });
    expect(act).toEqual([
        { A: 'C', B: 'D' },
        { A: 'Y',  B: 'X' },
    ]);

    MOCK.C1.v = 'XXX';
    MOCK.C1.h = 'XXX';
    MOCK.C1.w = 'XXX';
    act = sheetToJson(MOCK, { trimOnEmptyHeader: true });
    expect(act).toEqual([
        { A: 'C', B: 'D', XXX: 'E' },
        { A: 'Y',  B: 'X', XXX: '' },
    ]);
});