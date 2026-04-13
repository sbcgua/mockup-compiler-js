// @ts-check

/** @typedef {import('../types').EolMode} EolMode */
/** @typedef {import('../types').MockRow} MockRow */
/** @typedef {import('../types').MockTable} MockTable */

/**
 * @typedef {object} TabbedStringifyOptions
 * @property {EolMode} [eolChar]
 * @property {boolean} [upperCaseColumns]
 * @property {boolean} [headOnly]
 */

/**
 * @param {MockTable | MockRow[]} data
 * @param {string[] | null} [columns]
 * @param {TabbedStringifyOptions} [options]
 */
export function stringifyWithTabs(data, columns = null, {
    eolChar = 'crlf',
    upperCaseColumns = false,
    headOnly = false,
} = {}) {
    columns || (columns = /** @type {MockTable} */ (data).__columns__);
    if (!Array.isArray(columns)) throw Error ('__columns__ not found');

    const output = [];

    // Columns
    output.push(
        (upperCaseColumns
            ? columns.map(c => c.toUpperCase())
            : columns)
            .join('\t'));

    if (!headOnly) {
        for (let i of data) {
            const values = columns.map(c => i[c]);
            output.push(values.join('\t'));
        }
    }

    if (!['lf', 'crlf'].includes(eolChar)) throw Error('Unexpected EOL char');
    const delimiter = (eolChar === 'lf') ? '\n' : '\r\n';

    return output.join(delimiter);
}
