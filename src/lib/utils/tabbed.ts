import type { EolMode, MockRow, MockTable } from '../types';

type TabbedStringifyOptions = {
    eolChar?: EolMode;
    upperCaseColumns?: boolean;
    headOnly?: boolean;
};

export function stringifyWithTabs(
    data: MockTable | MockRow[],
    columns: string[] | null = null,
    {
        eolChar = 'crlf',
        upperCaseColumns = false,
        headOnly = false,
    }: TabbedStringifyOptions = {}
): string {
    columns ||= (data as MockTable).__columns__;
    if (!Array.isArray(columns)) throw Error('__columns__ not found');

    const output: string[] = [];

    output.push(
        (upperCaseColumns ? columns.map(column => column.toUpperCase()) : columns).join('\t')
    );

    if (!headOnly) {
        for (const row of data) {
            const values = columns.map(column => row[column]);
            output.push(values.join('\t'));
        }
    }

    if (!['lf', 'crlf'].includes(eolChar)) throw Error('Unexpected EOL char');
    const delimiter = eolChar === 'lf' ? '\n' : '\r\n';

    return output.join(delimiter);
}
