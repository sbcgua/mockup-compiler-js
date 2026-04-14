import { sheetToJson } from './sheet-reader.ts';
import type { WorkbookLike, WorkbookMocks } from '../types';

type WorkbookReadError = Error & { _sheet?: string };

export function extractWorkbookSheets(wb: WorkbookLike, sheetsToSave: string[] = wb.SheetNames): WorkbookMocks {
    const firstMissingSheet = sheetsToSave.find(sheetName => !wb.Sheets[sheetName]);
    if (firstMissingSheet) throw Error(`Sheet [${firstMissingSheet}] not found`);

    const result: WorkbookMocks = {};
    for (const sheetName of sheetsToSave) {
        try {
            wb.Sheets[sheetName].__sheetName__ = sheetName;
            result[sheetName.toLowerCase()] = sheetToJson(wb.Sheets[sheetName], {
                formatters: {
                    date: value => {
                        if (!(value instanceof Date)) return '';
                        const day = value.getDate().toString().padStart(2, '0');
                        const month = (1 + value.getMonth()).toString().padStart(2, '0');
                        const year = value.getFullYear().toString();
                        return `${day}.${month}.${year}`;
                    },
                },
                keepEmptyRows: true,
                firstRowCommentChar: '#',
                trimOnEmptyHeader: true,
            });
        } catch (error) {
            throw Object.assign(error as WorkbookReadError, { _sheet: sheetName });
        }
    }
    return result;
}
