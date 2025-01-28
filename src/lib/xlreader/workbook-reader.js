import { sheetToJson } from './sheet-reader.js';

export function extractWorkbookSheets(wb, sheetsToSave) {
    if (!sheetsToSave) sheetsToSave = wb.SheetNames;
    const firstMissingSheet = sheetsToSave.find(s => !wb.Sheets[s]);
    if (firstMissingSheet) throw Error(`Sheet [${firstMissingSheet}] not found`);

    const result = {};
    for (let s of sheetsToSave) {
        try {
            wb.Sheets[s].__sheetName__ = s;
            result[s.toLowerCase()] = sheetToJson(wb.Sheets[s], {
                formatters: {
                    date: (d) => {
                        if (!d) return '';
                        const day   = d.getDate().toString().padStart(2, '0');
                        const month = (1 + d.getMonth()).toString().padStart(2, '0');
                        const year  = d.getFullYear().toString();
                        return day + '.' + month + '.' + year;
                    },
                    // number: (name, formatted) => formatted,
                },
                keepEmptyRows: true,
                firstRowCommentChar: '#', // TODO make it configurable ?
                trimOnEmptyHeader: true,
                // skipIfFirstColumnEmpty: true,
            });
        } catch (error) {
            throw Object.assign(error, { _sheet: s });
        }
    }
    return result;
}
