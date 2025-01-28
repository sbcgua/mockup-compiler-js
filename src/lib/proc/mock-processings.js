import { extractWorkbookSheets } from '../xlreader/workbook-reader.js';
import { sheetToJson } from '../xlreader/sheet-reader.js';
import { stringifyWithTabs } from '../utils/tabbed.js';

const CONTENT_SHEET_NAME = '_contents';
const EXCLUDE_SHEET_NAME = '_exclude';

function findSheetsToSave(wb) {
    const sheets = wb.SheetNames;
    if (!sheets) throw Error('Workbook does not contain sheets');

    let sheetsToSave = [];

    if (sheets.includes(CONTENT_SHEET_NAME)) {
        const contents = sheetToJson(wb.Sheets[CONTENT_SHEET_NAME], { lowerCaseColumns: true });
        if (!contents.length) throw Error('Contents does not contain entries');
        if (contents.__columns__.length < 2) throw Error('Contents must have at least 2 columns');
        const [attrSheet, attrDoSave] = contents.__columns__;
        sheetsToSave = contents.filter(i => i[attrDoSave]).map(i => i[attrSheet]);
    } else {
        sheetsToSave = [...sheets];
    }

    if (sheets.includes(EXCLUDE_SHEET_NAME)) {
        const excludes = sheetToJson(wb.Sheets[EXCLUDE_SHEET_NAME], { lowerCaseColumns: true });
        if (!excludes.length) throw Error('excludes does not contain entries');
        if (excludes.__columns__.length < 1) throw Error('excludes must have at least 1 column');
        const [exclSheet] = excludes.__columns__;
        const exclSet = new Set(excludes.map(i => i[exclSheet]));
        exclSet.add(EXCLUDE_SHEET_NAME);
        sheetsToSave = sheetsToSave.filter(i => !exclSet.has(i));
    }

    return sheetsToSave.filter(sheet => !sheet.startsWith('-'));
}

/* returns: { mock1: [{}], mock2: [{}], ... } */
export function parseWokbookIntoMocks(wbData) {
    const sheetsToSave = findSheetsToSave(wbData);
    const mocks = extractWorkbookSheets(wbData, sheetsToSave);
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
