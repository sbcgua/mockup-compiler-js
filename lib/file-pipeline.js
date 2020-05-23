const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');
const assert = require('assert');
const { readFileAsync } = require('./utils/fs-utils');

class FilePipeline extends EventEmitter{
    constructor({destRoot, fileParser, mockProcessor}) {
        super();
        assert(typeof destRoot === 'string' && typeof fileParser === 'function' && typeof mockProcessor === 'function');
        this.destRoot = destRoot;
        this.fileParser = fileParser;
        this.mockProcessor = mockProcessor;
    }

    _proveDestDir(subDirName) {
        const destDir = path.join(this.destRoot, subDirName);
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir);
        return destDir;
    }

    _saveResultAsync(targetDirPath, mockFilename, data, rowCount) {
        assert(targetDirPath && mockFilename);
        const destPath = path.join(targetDirPath, mockFilename);
        return new Promise((resolve, reject) => {
            const fileStream = fs.createWriteStream(destPath, 'utf8');
            fileStream.on('finish', resolve);
            fileStream.on('error', reject);
            fileStream.end(data);
        }).then(() => this.emit('mock-processed', { name: mockFilename, rowCount }));
    }

    async processFile(filepath) {
        const filename = path.parse(filepath).name;

        try {
            const blob = await readFileAsync(filepath, 'binary');
            const parsedMocks = this.fileParser(blob);
            const targetDirName = filename.toLowerCase();
            const targetDirPath = this._proveDestDir(targetDirName);
            /* { mock1: [{}], mock2: [{}], ... } */

            let mockResults = [];
            for (const [mockName, mockData] of Object.entries(parsedMocks)) {
                const mockFilename = mockName + '.txt';
                const {data, rowCount} = this.mockProcessor(mockData);
                const savePromise = this._saveResultAsync(targetDirPath, mockFilename, data, rowCount);
                mockResults.push({
                    relativeMockName: `${targetDirName}/${mockFilename}`,
                    savePromise,
                });
            }

            await Promise.all(mockResults.map(r => r.savePromise));
            return mockResults.map(r => r.relativeMockName);

        } catch (error) {
            throw Object.assign(error, { _file: filename });
        }
    }
}

module.exports = FilePipeline;
