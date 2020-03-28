const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');
const { parseWorkbook } = require('./parse-workbook');
const { stringify } = require('./tabbed');
const { promisify } = require('util');
const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);

class FileProcessor extends EventEmitter{
    constructor(destRoot, eolChar) {
        super();
        this.destRoot = destRoot;
        this.eolChar  = eolChar;
    }

    _proveDestDir(name) {
        if (this.destRoot) {
            var destDir = path.join(this.destRoot, name);
            if (!fs.existsSync(destDir)) fs.mkdirSync(destDir);
        }
        return destDir;
    }

    async _saveResult(destDir, filename, data) {
        if (destDir) {
            filename = path.join(destDir, filename);
            return writeFileAsync(filename, data, 'utf8');
        }
    }

    async _parseFile(filepath) {
        const data  = await readFileAsync(filepath, 'binary');
        const wb    = XLSX.read(data, { type: 'binary' });
        const mocks = parseWorkbook(wb);
        return mocks;
    }

    async processFile(filepath) {
        const makeMockFileName = (n) => n + '.txt';

        const mocks = await this._parseFile(filepath);
        const wbName = path.parse(filepath).name;
        const mockDirName = wbName.toLowerCase();

        const mockNames = Object.keys(mocks);
        const destDir   = this._proveDestDir(mockDirName);
        const waitFor   = [];

        for (let m of mockNames) {
            try {
                const mockRows = mocks[m];
                const {data, rowCount} = this._processMock(mockRows);
                const promise = this._saveResult(destDir, makeMockFileName(m), data);
                waitFor.push(promise);
                this.emit('mock-processed', { name: m, rowCount });
            } catch (error) {
                throw Object.assign(error, { _loc: `${wbName}/${m}` });
            }
        }

        await Promise.all(waitFor);
        return mockNames.map(m => `${mockDirName}/${makeMockFileName(m)}`);
    }

    _processMock(mockRows) {
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
            data:     stringify(mockRows, columnsToSave, this.eolChar),
            rowCount: mockRows.length,
        };
    }
}

module.exports = FileProcessor;
