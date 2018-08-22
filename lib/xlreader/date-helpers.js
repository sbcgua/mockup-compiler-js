// Date helpers

// Internal constants
const EXCEL_DATE_MULT  = 24 * 60 * 60 * 1000;
const EXCEL_DATE_EPOCH = Date.UTC(1899, 11, 30); // (new Date(Date.UTC(1899, 11, 30))).valueOf()

// Date helpers
function date2num(v) {
    return (Date.parse(v) - EXCEL_DATE_EPOCH) / EXCEL_DATE_MULT;
}

function num2date(v) {
    if (!v) return null;
    if (typeof v === 'number') return new Date(v * EXCEL_DATE_MULT + EXCEL_DATE_EPOCH);
    if (typeof v.toString === 'function') return v.toString();
    return null;
}

module.exports = {
    date2num: date2num,
    num2date: num2date,
};
