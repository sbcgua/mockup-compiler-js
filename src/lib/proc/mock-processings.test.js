import { parseWokbookIntoMocks, createMockProcessor } from './mock-processings';
import { test, expect, describe } from 'vitest';

describe('parseWokbookIntoMocks (include/exclude sheets)', () => {

    const basicWb = {
        SheetNames: ['Sheet1', 'Sheet2'],
        Sheets: {
            'Sheet1': {
                '!ref': 'A1:A3',
                'A1': { 't': 's', 'v': 'X',     'r': '<t>X</t>',     'h': 'X',     'w': 'X' },
                'A2': { 't': 's', 'v': 'Vasya', 'r': '<t>Vasya</t>', 'h': 'Vasya', 'w': 'Vasya' },
                'A3': { 't': 's', 'v': 'Petya', 'r': '<t>Petya</t>', 'h': 'Petya', 'w': 'Petya' },
            },
            'Sheet2': {
                '!ref': 'A1:A3',
                'A1': { 't': 's', 'v': 'Y',     'r': '<t>Y</t>',     'h': 'Y',     'w': 'Y' },
                'A2': { 't': 's', 'v': 'Vasya', 'r': '<t>Vasya</t>', 'h': 'Vasya', 'w': 'Vasya' },
                'A3': { 't': 's', 'v': 'Petya', 'r': '<t>Petya</t>', 'h': 'Petya', 'w': 'Petya' },
            }

        },
    };

    test('basic test', () => {
        const act = parseWokbookIntoMocks(basicWb);
        expect(act).toEqual({
            sheet1: [
                { X: 'Vasya' },
                { X: 'Petya' },
            ],
            sheet2: [
                { Y: 'Vasya' },
                { Y: 'Petya' },
            ],
        });
    });

    test('test with _contents', () => {
        const act = parseWokbookIntoMocks({
            SheetNames: [...basicWb.SheetNames, '_contents'],
            Sheets: { ...basicWb.Sheets,
                '_contents': {
                    '!ref': 'A1:B3',
                    'A1': { 't': 's', 'v': 'Sheet', 'r': '<t>Sheet</t>', 'h': 'Sheet', 'w': 'Sheet' },
                    'B1': { 't': 's', 'v': 'doSave', 'r': '<t>doSave</t>', 'h': 'doSave',   'w': 'doSave' },
                    'A2': { 't': 's', 'v': 'Sheet1', 'r': '<t>Sheet1</t>', 'h': 'Sheet1', 'w': 'Sheet1' },
                    'B2': { 't': 's', 'v': 'X', 'r': '<t>X</t>', 'h': 'X', 'w': 'X' },
                    'A3': { 't': 's', 'v': 'Sheet2', 'r': '<t>Sheet2</t>', 'h': 'Sheet2', 'w': 'Sheet2' },
                }
            }
        });
        expect(act).toEqual({
            sheet1: [
                { X: 'Vasya' },
                { X: 'Petya' },
            ],
        });
    });

    test('should skip excludes', () => {
        const act = parseWokbookIntoMocks({
            SheetNames: [...basicWb.SheetNames, '_exclude'],
            Sheets: { ...basicWb.Sheets,
                '_exclude': {
                    '!ref': 'A1:B2',
                    'A1': { 't': 's', 'v': 'Sheet', 'r': '<t>Sheet</t>', 'h': 'Sheet', 'w': 'Sheet' },
                    'B1': { 't': 's', 'v': 'comment', 'r': '<t>comment</t>', 'h': 'comment',   'w': 'comment' },
                    'A2': { 't': 's', 'v': 'Sheet2', 'r': '<t>Sheet2</t>', 'h': 'Sheet2', 'w': 'Sheet2' },
                    'B2': { 't': 's', 'v': 'X', 'r': '<t>X</t>', 'h': 'X', 'w': 'X' },
                }
            }
        });
        expect(act).toEqual({
            sheet1: [
                { X: 'Vasya' },
                { X: 'Petya' },
            ],
        });
    });

    test('should skip sheets starting with -', () => {
        const act = parseWokbookIntoMocks({
            SheetNames: [...basicWb.SheetNames, '-Sheet3'],
            Sheets: { ...basicWb.Sheets,
                '-Sheet3': {
                    '!ref': 'A1:A3',
                    'A1': { 't': 's', 'v': 'Z',     'r': '<t>Z</t>',     'h': 'Z',     'w': 'Z' },
                    'A2': { 't': 's', 'v': 'Vasya', 'r': '<t>Vasya</t>', 'h': 'Vasya', 'w': 'Vasya' },
                    'A3': { 't': 's', 'v': 'Petya', 'r': '<t>Petya</t>', 'h': 'Petya', 'w': 'Petya' },
                }
            },
        });
        expect(act).toEqual({
            sheet1: [
                { X: 'Vasya' },
                { X: 'Petya' },
            ],
            sheet2: [
                { Y: 'Vasya' },
                { Y: 'Petya' },
            ],

        });
    });


});

describe('createMockProcessor', () => {
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

    test('should skip "-/_" marked columns', async () => {
        const input = Object.assign([
            { A: 'Vasya', B: '01.09.2018', _C: 'X', '-D': 'Y' },
            { A: 'Petya', B: '02.09.2018', _C: 'X', '-D': 'Y' },
        ], { __columns__: ['A', 'B', '_C', '-D'] });

        expect(createMockProcessor('lf')(input)).toEqual({
            data: [
                'A\tB\t_C',
                'Vasya\t01.09.2018\tX',
                'Petya\t02.09.2018\tX'
            ].join('\n'),
            rowCount: 2,
        });

        expect(createMockProcessor('lf', '_')(input)).toEqual({
            data: [
                'A\tB\t-D',
                'Vasya\t01.09.2018\tY',
                'Petya\t02.09.2018\tY'
            ].join('\n'),
            rowCount: 2,
        });
    });
});