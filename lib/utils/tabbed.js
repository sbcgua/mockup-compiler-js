function stringifyWithTabs(data, columns = null, eolChar = 'crlf') {
    columns || (columns = data.__columns__);
    if (!Array.isArray(columns)) throw Error ('__columns__ not found');

    const output = [];
    output.push(columns.join('\t'));

    for (let i of data) {
        const values = columns.map(c => i[c]);
        output.push(values.join('\t'));
    }

    if (!['lf', 'crlf'].includes(eolChar)) throw Error('Unexpected EOL char');
    eolChar = (eolChar === 'lf') ? '\n' : '\r\n';

    return output.join(eolChar);
}

module.exports = {
    stringifyWithTabs,
};
