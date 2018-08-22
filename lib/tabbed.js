
function stringify(data, columns = null) {
    columns || (columns = data.__columns__);
    if (!Array.isArray(columns)) throw Error ('__columns__ not found');

    const output = [];
    output.push(columns.join('\t'));

    for (let i of data) {
        const values = columns.map(c => i[c]);
        output.push(values.join('\t'));
    }

    return output.join('\r\n') + '\r\n';
}

module.exports = {
    stringify,
};
