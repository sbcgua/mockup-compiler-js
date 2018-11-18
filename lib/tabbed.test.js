const { stringify } = require('./tabbed');

const MOCK = [
    { A: 'Vasya', B: '01.09.2018', C: '15.00' },
    { A: 'Petya', B: '02.09.2018', C: '16.37' },
];
Object.defineProperty(MOCK, '__columns__', {value: ['A', 'B', 'C'], enumerable: false});

test('basic test', () => {
    const act = stringify(MOCK);
    expect(act).toBe('A\tB\tC\r\nVasya\t01.09.2018\t15.00\r\nPetya\t02.09.2018\t16.37');
});

test('EOL test', () => {
    const act = stringify(MOCK, null, 'lf');
    expect(act).toBe('A\tB\tC\nVasya\t01.09.2018\t15.00\nPetya\t02.09.2018\t16.37');
});
