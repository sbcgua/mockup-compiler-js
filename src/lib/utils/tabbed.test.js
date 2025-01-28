import { stringifyWithTabs } from './tabbed';
import { test, expect, describe } from 'vitest';

const MOCK = [
    { A: 'Vasya', B: '01.09.2018', c: '15.00' },
    { A: 'Petya', B: '02.09.2018', c: '16.37' },
];
Object.defineProperty(MOCK, '__columns__', {value: ['A', 'B', 'c'], enumerable: false});

describe('stringifyWithTabs', () => {
    test('basic test', () => {
        const act = stringifyWithTabs(MOCK);
        expect(act).toBe('A\tB\tc\r\nVasya\t01.09.2018\t15.00\r\nPetya\t02.09.2018\t16.37');
    });

    test('EOL test', () => {
        const act = stringifyWithTabs(MOCK, null, { eolChar: 'lf' });
        expect(act).toBe('A\tB\tc\nVasya\t01.09.2018\t15.00\nPetya\t02.09.2018\t16.37');
    });

    test('Column uppercase', () => {
        const act = stringifyWithTabs(MOCK, null, { eolChar: 'lf', upperCaseColumns: true });
        expect(act).toBe('A\tB\tC\nVasya\t01.09.2018\t15.00\nPetya\t02.09.2018\t16.37');
    });

    test('Head only', () => {
        const act = stringifyWithTabs(MOCK, null, { eolChar: 'lf', headOnly: true });
        expect(act).toBe('A\tB\tc');
    });
});