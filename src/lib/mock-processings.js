import XLSX from 'xlsx';
import { parseWorkbook } from './workbook-parser.js';
import { stringifyWithTabs } from './utils/tabbed.js';

/* returns: { mock1: [{}], mock2: [{}], ... } */
export function parseExcelIntoMocks(blob) {
    const wb    = XLSX.read(blob, { type: 'binary' });
    const mocks = parseWorkbook(wb);
    return mocks;
}

export function createMockProcessor(eolChar, skipFieldsStartingWith) {
    if (!skipFieldsStartingWith) skipFieldsStartingWith = '-';
    return (mockRows) => {
        let columnsToSave = mockRows.__columns__;

        // Remove columns after blank space and starting from _
        const firstEmptyCol = columnsToSave.findIndex(c => !c);
        if (firstEmptyCol === 0) throw Error('First column is empty');
        if (firstEmptyCol > 0) columnsToSave = columnsToSave.slice(0, firstEmptyCol);
        columnsToSave = columnsToSave.filter(c => !c.startsWith(skipFieldsStartingWith));

        // Filter rows after blank space
        const firstEmptyRow = mockRows.findIndex(r => r.__isempty__);
        if (firstEmptyRow > 0) {
            mockRows = mockRows.slice(0, firstEmptyRow);
        }

        return {
            data: stringifyWithTabs(mockRows, columnsToSave, {
                eolChar,
                headOnly: firstEmptyRow === 0 // we still need empty header
            }),
            rowCount: mockRows.length,
        };
    };
}
