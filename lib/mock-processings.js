const XLSX = require('xlsx');
const { parseWorkbook } = require('./workbook-parser');
const { stringifyWithTabs } = require('./utils/tabbed');

/* returns: { mock1: [{}], mock2: [{}], ... } */
function parseExcelIntoMocks(blob) {
    const wb    = XLSX.read(blob, { type: 'binary' });
    const mocks = parseWorkbook(wb);
    return mocks;
}

function createMockProcessor(eolChar) {
    return (mockRows) => {
        let columnsToSave = mockRows.__columns__;

        // Remove columns after blank space and starting from _
        const firstEmptyCol = columnsToSave.findIndex(c => !c);
        if (firstEmptyCol === 0) throw Error('First column is empty');
        if (firstEmptyCol > 0) columnsToSave = columnsToSave.slice(0, firstEmptyCol);
        columnsToSave = columnsToSave.filter(c => !c.startsWith('_'));

        // Filter rows after blank space
        const firstEmptyRow = mockRows.findIndex(r => r.__isempty__);
        if (firstEmptyRow > 0) mockRows = mockRows.slice(0, firstEmptyRow);

        return {
            data:     stringifyWithTabs(mockRows, columnsToSave, eolChar),
            rowCount: mockRows.length,
        };
    };
}

module.exports = {
    parseExcelIntoMocks,
    createMockProcessor,
};
