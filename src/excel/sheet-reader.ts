import * as XLSX from 'xlsx';
import type { CellObject, Range, WorkSheet } from 'xlsx';
import type { MockRow, MockTable, SheetCellValue } from '../types/index';

const XLSXUtils = XLSX.utils;

const EXCEL_DATE_MULT = 24 * 60 * 60 * 1000;
const EXCEL_DATE_EPOCH = Date.UTC(1899, 11, 30);

type CellFormatterSet = {
    date?: (value: Date | string | null, formatted?: string) => SheetCellValue;
    number?: (value: number, formatted?: string) => SheetCellValue;
};

type ColumnConverter = 'd' | 'f' | ((value: unknown) => SheetCellValue);

type SheetToJsonOptions = {
    renameMap?: Record<string, string>;
    convMap?: Record<string, ColumnConverter>;
    useRenamedForConv?: boolean;
    formatters?: CellFormatterSet;
    lowerCaseColumns?: boolean;
    keepEmptyRows?: boolean;
    skipIfFirstColumnEmpty?: boolean;
    firstRowCommentChar?: string;
    trimOnEmptyHeader?: boolean;
};

type ColumnSpec = {
    ref: string;
    default: SheetCellValue;
    name?: string;
    nameOrig?: string;
    converter?: (value: unknown) => SheetCellValue;
};

type LocatedError = Error & { _loc?: string };

export function num2date(v: unknown): Date | string | null {
    if (!v) return null;
    if (typeof v === 'number') return new Date(v * EXCEL_DATE_MULT + EXCEL_DATE_EPOCH);
    if (typeof (v as { toString?: unknown }).toString === 'function') return String(v);
    return null;
}

const CONVERTERS: Record<'d' | 'f', { default: SheetCellValue; func: (value: unknown) => SheetCellValue }> = {
    d: {
        default: '',
        func: value => num2date(value),
    },
    f: {
        default: 0,
        func: value => value ? Number.parseFloat(String(value)) : 0,
    },
};

function isFirstRowCommented(sheet: WorkSheet, range: Range, commentChar?: string): boolean {
    if (typeof commentChar !== 'string' || commentChar.length !== 1) return false;
    const rowRef = XLSXUtils.encode_row(range.s.r);
    const colRef = XLSXUtils.encode_col(range.s.c);
    const cell = sheet[colRef + rowRef];
    return Boolean(cell?.t === 's' && typeof cell.v === 'string' && cell.v[0] === commentChar);
}

function buildColumns(sheet: WorkSheet, range: Range, opts?: SheetToJsonOptions): ColumnSpec[] {
    const { renameMap, convMap, lowerCaseColumns } = opts || {};
    const numcols = range.e.c - range.s.c + 1;
    const headRowRef = XLSXUtils.encode_row(range.s.r);

    const columns: ColumnSpec[] = Array.from({ length: numcols }, (_, i) => ({
        ref: XLSXUtils.encode_col(range.s.c + i),
        default: '',
    }));

    for (let c = range.s.c; c <= range.e.c; c++) {
        const colSpec = columns[c - range.s.c];
        const cell = sheet[colSpec.ref + headRowRef];

        if (cell) {
            let colName = XLSXUtils.format_cell(cell);
            colSpec.nameOrig = colName;
            if (lowerCaseColumns) colName = colName.toLowerCase();
            colSpec.name = renameMap?.[colName] || colName;

            const convKey = opts?.useRenamedForConv ? colSpec.name : colSpec.nameOrig;
            const conv = convKey ? convMap?.[convKey] : undefined;
            if (conv) {
                if (typeof conv === 'string' && CONVERTERS[conv]) {
                    colSpec.default = CONVERTERS[conv].default;
                    colSpec.converter = CONVERTERS[conv].func;
                } else if (typeof conv === 'function') {
                    colSpec.converter = conv;
                }
            }
        }
    }

    return columns;
}

export function sheetToJson(sheet: WorkSheet | null, opts?: SheetToJsonOptions): MockTable {
    if (sheet === null || sheet['!ref'] === null || sheet['!ref'] === undefined) {
        const empty = [] as unknown as MockTable;
        Object.defineProperty(empty, '__columns__', { value: [], enumerable: false });
        return empty;
    }

    const { formatters, keepEmptyRows, skipIfFirstColumnEmpty, firstRowCommentChar, trimOnEmptyHeader } = opts || {};
    const range = XLSXUtils.decode_range(sheet['!ref']);

    if (firstRowCommentChar && isFirstRowCommented(sheet, range, firstRowCommentChar)) {
        range.s.r += 1;
    }

    const columns = buildColumns(sheet, range, opts);
    const firstColName = columns[0]?.name;
    const out = [] as unknown as MockTable;

    if (trimOnEmptyHeader) {
        const firstEmptyColIndex = columns.findIndex(item => !item.name);
        if (firstEmptyColIndex > 0 && (firstEmptyColIndex - 1 < range.e.c - range.s.c)) {
            range.e.c = range.s.c + firstEmptyColIndex - 1;
        }
    }

    let r = 0;
    let c = 0;
    let column: ColumnSpec | undefined;
    let cell: CellObject | undefined;

    try {
        for (r = range.s.r + 1; r <= range.e.r; r++) {
            const rowRef = XLSXUtils.encode_row(r);
            const row = {} as MockRow;
            let isEmpty = true;
            let firstColEmpty = false;

            for (c = range.s.c; c <= range.e.c; c++) {
                column = columns[c - range.s.c];
                cell = sheet[column.ref + rowRef] as CellObject | undefined;

                if (cell === undefined || cell.t === undefined || cell.v === undefined) {
                    if (c === range.s.c) firstColEmpty = true;
                    row[column.name ?? ''] = column.default;
                    continue;
                }

                if (!'sbne'.includes(cell.t)) throw Error(`unrecognized type ${cell.t}`);
                if (cell.t === 'e') continue;

                row[column.name ?? ''] = column.converter
                    ? column.converter(cell.v)
                    : formatCell(cell, formatters);
                if (cell.v) isEmpty = false;
            }

            if (!isEmpty || keepEmptyRows) {
                if (skipIfFirstColumnEmpty && (firstColEmpty || (firstColName && row[firstColName] === ''))) continue;
                if (isEmpty) Object.defineProperty(row, '__isempty__', { value: true, enumerable: false });
                Object.defineProperty(row, '__rowNum__', { value: r, enumerable: false });
                out.push(row);
            }
        }
    } catch (error) {
        let detail = '';
        if (column) {
            detail = column.name ?? '';
            if (cell) detail += ` = ${cell.v} (${cell.w})`;
        }
        throw Object.assign(error as LocatedError, { _loc: `R${r + 1}C${c + 1} [${detail}]` });
    }

    Object.defineProperty(out, '__columns__', { value: columns.map(item => item.name ?? ''), enumerable: false });
    return out;
}

function formatCell(cell: CellObject, formatters?: CellFormatterSet): SheetCellValue {
    if (cell.t === 'b') return cell.v as boolean;
    if (cell.t === 's') return cell.v as string;
    if (cell.t === 'n') {
        if (cell.w && cell.w.includes('/')) {
            let date: SheetCellValue = num2date(cell.v);
            if (formatters?.date) date = formatters.date(date, cell.w);
            return date;
        }
        let value: SheetCellValue = cell.v as number;
        if (formatters?.number) value = formatters.number(cell.v as number, cell.w);
        return value;
    }
    return null;
}
