const { sheetToJson } = require('./xlreader');

const CONTENT_SHEET_NAME = '_contents';

function parseWorkbook(wb) {
    const sheets = wb.SheetNames;
    if (!sheets) throw Error('Workbook does not contain sheets');
    if (!sheets.includes(CONTENT_SHEET_NAME)) throw Error('Workbook does not contain _contents sheet');

    const contents = sheetToJson(wb.Sheets[CONTENT_SHEET_NAME], { lowerCaseColumns: true });
    if (!contents.length) throw Error('Contents does not contain entries');
    if (contents.__columns__.length < 2) throw Error('Contents must have at least 2 columns');
    const [attrSheet, attrDoSave] = contents.__columns__;

    const sheetsToSave = contents.filter(i => i[attrDoSave]).map(i => i[attrSheet]);

    for (let s of sheetsToSave) if (!wb.Sheets[s]) throw Error(`Sheet [${s}] not found`);

    const result = {};
    const formatters = {
        date: (d) => {
            const day = d.getDate().toString().padStart(2, '0');
            const month = (1 + d.getMonth()).toString().padStart(2, '0');
            const year = d.getFullYear().toString();
            return day + '.' + month + '.' + year;
        },
        // number: (name, formatted) => formatted,
    };
    for (let s of sheetsToSave) {
        result[s.toLowerCase()] = sheetToJson(wb.Sheets[s], {
            formatters,
            keepEmptyRows: true,
            // skipIfFirstColumnEmpty: true,
        });
    }
    return result;
}

module.exports = {
    parseWorkbook,
};
