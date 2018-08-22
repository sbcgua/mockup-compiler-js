const { parseWorkbook } = require('./parse-workbook');

const MOCK = {
    SheetNames: ['_contents', 'Sheet1'],
    Sheets: {
        '_contents': {
            '!ref': 'A1:B3',
            'A1': { 't': 's', 'v': 'Sheet', 'r': '<t>Sheet</t>', 'h': 'Sheet', 'w': 'Sheet' },
            'B1': { 't': 's', 'v': 'doSave', 'r': '<t>doSave</t>', 'h': 'doSave',   'w': 'doSave' },
            'A2': { 't': 's', 'v': 'Sheet1', 'r': '<t>Sheet1</t>', 'h': 'Sheet1', 'w': 'Sheet1' },
            'B2': { 't': 's', 'v': 'X', 'r': '<t>X</t>', 'h': 'X', 'w': 'X' },
            'A3': { 't': 's', 'v': 'Sheet2', 'r': '<t>Sheet2</t>', 'h': 'Sheet2', 'w': 'Sheet2' },
        },
        'Sheet1': {
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
        }
    },
};

test('basic test', () => {
    const act = parseWorkbook(MOCK);
    expect(act).toEqual({
        sheet1: [
            { A: 'Vasya', B: '01.09.2018', C: 15.00, D: true },
            { A: 'Petya', B: '02.09.2018', C: 16.37, D: false },
        ],
    });
    expect(act.sheet1.__columns__).toEqual(['A', 'B', 'C', 'D']);
});
