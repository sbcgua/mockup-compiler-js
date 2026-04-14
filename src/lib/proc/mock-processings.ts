import { extractWorkbookSheets } from '../xlreader/workbook-reader.ts';
import { sheetToJson } from '../xlreader/sheet-reader.ts';
import { stringifyWithTabs } from '../utils/tabbed.ts';
import type { MockProcessor, MockTable, WorkbookLike, WorkbookMocks } from '../types';

const CONTENT_SHEET_NAME = '_contents';
const EXCLUDE_SHEET_NAME = '_exclude';

function findSheetsToSave(wb: WorkbookLike): string[] {
    const sheets = wb.SheetNames;
    if (!sheets) throw Error('Workbook does not contain sheets');

    let sheetsToSave: string[];

    if (sheets.includes(CONTENT_SHEET_NAME)) {
        const contents = sheetToJson(wb.Sheets[CONTENT_SHEET_NAME], { lowerCaseColumns: true });
        if (!contents.length) throw Error('Contents does not contain entries');
        if (contents.__columns__.length < 2) throw Error('Contents must have at least 2 columns');
        const [attrSheet, attrDoSave] = contents.__columns__;
        sheetsToSave = contents
            .filter(item => Boolean(item[attrDoSave]))
            .map(item => String(item[attrSheet]));
    } else {
        sheetsToSave = [...sheets];
    }

    if (sheets.includes(EXCLUDE_SHEET_NAME)) {
        const excludes = sheetToJson(wb.Sheets[EXCLUDE_SHEET_NAME], { lowerCaseColumns: true });
        if (!excludes.length) throw Error('excludes does not contain entries');
        if (excludes.__columns__.length < 1) throw Error('excludes must have at least 1 column');
        const [exclSheet] = excludes.__columns__;
        const exclSet = new Set(excludes.map(item => String(item[exclSheet])));
        exclSet.add(EXCLUDE_SHEET_NAME);
        sheetsToSave = sheetsToSave.filter(item => !exclSet.has(item));
    }

    return sheetsToSave.filter(sheet => !sheet.startsWith('-'));
}

export function parseWorkbookIntoMocks(wbData: WorkbookLike): WorkbookMocks {
    const sheetsToSave = findSheetsToSave(wbData);
    return extractWorkbookSheets(wbData, sheetsToSave);
}

export function createMockProcessor(eolChar: string, skipFieldsStartingWith = '-'): MockProcessor {
    return (mockRows: MockTable) => {
        let columnsToSave = mockRows.__columns__;

        const firstEmptyCol = columnsToSave.findIndex(column => !column);
        if (firstEmptyCol === 0) throw Error('First column is empty');
        if (firstEmptyCol > 0) columnsToSave = columnsToSave.slice(0, firstEmptyCol);
        columnsToSave = columnsToSave.filter(column => !column.startsWith(skipFieldsStartingWith));

        const firstEmptyRow = mockRows.findIndex(row => row.__isempty__);
        let rowsToSave = mockRows;
        if (firstEmptyRow > 0) {
            rowsToSave = mockRows.slice(0, firstEmptyRow) as MockTable;
            Object.defineProperty(rowsToSave, '__columns__', { value: mockRows.__columns__, enumerable: false });
        }

        return {
            data: stringifyWithTabs(rowsToSave, columnsToSave, {
                eolChar: eolChar as 'lf' | 'crlf',
                headOnly: firstEmptyRow === 0,
            }),
            rowCount: rowsToSave.length,
        };
    };
}
