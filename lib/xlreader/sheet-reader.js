// Reading converters
const XLSX = require('xlsx');
const dateHelpers = require('./date-helpers');

const CONVERTERS = {
    'd': {
        default: '',
        func: (value) => dateHelpers.num2date(value),
    },
    'f': {
        default: 0,
        func: (value) => value ? Number.parseFloat(value) : 0,
    },
};

function isFirstRowCommented(sheet, range, commentChar) {
    if (typeof commentChar !== 'string' || commentChar.length !== 1) return false;
    const rowRef = XLSX.utils.encode_row(range.s.r);
    const colRef = XLSX.utils.encode_col(range.s.c);
    const cell = sheet[colRef + rowRef];
    return cell.t === 's' && cell.v[0] === commentChar;
}

function buildColumns(sheet, range, opts) {
    const { renameMap, convMap, lowerCaseColumns } = opts || {};
    const numcols    = range.e.c - range.s.c + 1;
    const headRowRef = XLSX.utils.encode_row(range.s.r);

    const columns = Array.from(Array(numcols), (_, i) => ({
        ref: XLSX.utils.encode_col(range.s.c + i),
        default: '',
    }));

    // Collect header && build defaults
    for(let c = range.s.c; c <= range.e.c; c++) {
        const colSpec = columns[c - range.s.c];
        const cell = sheet[colSpec.ref + headRowRef];

        if(cell) {
            let colName    = XLSX.utils.format_cell(cell);
            colSpec.nameOrig = colName;
            if (lowerCaseColumns) colName = colName.toLowerCase();
            colSpec.name     = renameMap && renameMap[colName] || colName; // rename columns

            const conv = convMap && convMap[opts.useRenamedForConv ? colSpec.name : colSpec.nameOrig];
            if (conv) {
                if (typeof conv === 'string' && CONVERTERS[conv]) {
                    colSpec.default   = CONVERTERS[conv].default;
                    colSpec.converter = CONVERTERS[conv].func;
                } else if (typeof conv === 'function') {
                    colSpec.converter = conv;
                }
            }
        }
    }

    return columns;
}

// Convert excel sheet into list of object
// options:
//   renameMap - rename columns, { nameOfColumn: 'newNameOfColumn', ... }
//   convMap   - convert column value, { nameOfColumn: <converter> }
//               <converter> can be 'f' for float, 'd' for date, or function for custom convertion
//   useRenamedForConv - if true, renamed column names will be used to search converter
//   formatters: { date, number } - optional formatters for data types
//   lowerCaseColumns: convert columns to lower case

function sheetToJson(sheet, opts){
    if(sheet === null || sheet['!ref'] === null) return [];

    const { formatters, keepEmptyRows, skipIfFirstColumnEmpty, firstRowCommentChar, trimOnEmptyHeader } = opts || {};
    const range = XLSX.utils.decode_range(sheet['!ref']);

    if (firstRowCommentChar && isFirstRowCommented(sheet, range, firstRowCommentChar)) {
        range.s.r += 1;
    }

    const columns = buildColumns(sheet, range, opts);
    const firstColName = columns[0].name;
    const out  = [];
    if (trimOnEmptyHeader) {
        const firstEmptyColIndex = columns.findIndex(i => !i.name);
        if (firstEmptyColIndex > 0 && ( firstEmptyColIndex - 1 < range.e.c - range.s.c )) range.e.c = range.s.c + firstEmptyColIndex - 1;
    }

    // Collect data rows
    let r, c, rowRef, column, cell;
    try {
        for (r = range.s.r + 1; r <= range.e.r; r++) {
            rowRef = XLSX.utils.encode_row(r);
            const row    = {};
            let isEmpty  = true;
            let firstColEmpty = false;

            for (c = range.s.c; c <= range.e.c; c++) {
                column = columns[c - range.s.c];
                cell   = sheet[column.ref + rowRef];
                if(cell === undefined || cell.t === undefined || cell.v === undefined) {
                    if (c === range.s.c) firstColEmpty = true;
                    row[column.name] = column.default; // add but don't trigger isempty
                    continue;
                }

                // check type. e - error, s - string, b - boolean, n - number
                if (!'sbne'.includes(cell.t)) throw Error('unrecognized type ' + cell.t);
                if (cell.t === 'e') continue;

                row[column.name] = column.converter
                    ? column.converter(cell.v)
                    : formatCell(cell, formatters); // XLSX.utils.format_cell(cell);
                isEmpty = false;
            }

            if(!isEmpty || keepEmptyRows) {
                if (skipIfFirstColumnEmpty && (firstColEmpty || row[firstColName] === '')) continue;
                if (isEmpty) Object.defineProperty(row, '__isempty__', {value: true, enumerable: false});
                Object.defineProperty(row, '__rowNum__', {value: r, enumerable: false});
                out.push(row);
            }
        }
    } catch (error) {
        let detail = '';
        if (column) {
            detail = column.name;
            if (cell) detail += ` = ${cell.v} (${cell.w})`;
        }
        throw Object.assign(error, { _loc: `R${r + 1}C${c + 1} [${detail}]` });
    }

    Object.defineProperty(out, '__columns__', {value: columns.map(i => i.name), enumerable: false});
    return out;
}

function formatCell(cell, formatters) {
    // XLSX.utils.format_cell - does not identify dates and also return numbers as string
    if (cell.t === 'b') return cell.v; // boolean
    if (cell.t === 's') return cell.v; // string
    if (cell.t === 'n') {
        if (cell.w && cell.w.includes('/')) { // guess it is date
            let date = dateHelpers.num2date(cell.v);
            if (formatters && typeof formatters.date === 'function') date = formatters.date(date, cell.w);
            return date;
        }
        let value = cell.v;
        if (formatters && typeof formatters.number === 'function') value = formatters.number(value, cell.w);
        return value;
    }
    return null;
}

module.exports = {
    sheetToJson: sheetToJson,
};
