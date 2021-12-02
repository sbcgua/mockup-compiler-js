const { sheetToJson } = require('./xlreader');

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

function parseWorkbook(wb) {
    const sheetsToSave = findSheetsToSave(wb);
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
                firstRowCommentChar: '#',
                trimOnEmptyHeader: true,
                // skipIfFirstColumnEmpty: true,
            });
        } catch (error) {
            throw Object.assign(error, { _sheet: s });
        }
    }
    return result;
}

module.exports = {
    parseWorkbook,
};
