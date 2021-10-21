const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');
const assert = require('assert');
const crypto = require('crypto');
const { readFileAsync } = require('./utils/fs-utils');

class ExcelFileManager extends EventEmitter {
    #includedFiles;
    #fileHashMap;
    #destDir;
    #withHashing = false;
    #fileParser;
    #mockProcessor;

    /**
     * Create File pipeline
     * @param {string} destDir destination folder
     * @param {Function} fileParser file parsing routine
     * @param {Function} mockProcessor single mock processing routine
     */
    constructor({destDir, fileParser, mockProcessor, withHashing}) {
        super();
        assert(typeof destDir === 'string' && typeof fileParser === 'function' && typeof mockProcessor === 'function');
        this.#destDir = destDir;
        this.#fileParser = fileParser;
        this.#mockProcessor = mockProcessor;
        this.#withHashing = withHashing;
        this.#initResults();
    }

    #initResults() {
        this.#includedFiles = new Set();
        this.#fileHashMap = new Map();
    }

    get includedFiles() { return [...this.#includedFiles] }
    get fileHashMap() { return this.#fileHashMap }

    async processDir(srcPath) {

    }

    async processOneFile(filepath) {
        const filename = path.parse(filepath).name;

        try {
            const blob = await readFileAsync(filepath, 'binary');
            const hash = this.#calculateHash(blob);
            const parsedMocks = this.#fileParser(blob); /* { mock1: [{}], mock2: [{}], ... } */
            const targetDirName = filename.toLowerCase();
            this.#proveDestDir(path.join(this.#destDir, targetDirName));

            const promises = [...Object.entries(parsedMocks)].map(([mockName, mockCells]) => this.#processMock(targetDirName, mockName, mockCells));
            const mockList = await Promise.all(promises);
            return {
                mockList,
                sourceFileHash: hash,
            };
        } catch (error) {
            throw Object.assign(error, { _file: filename });
        }
    }

    #proveDestDir(destDir) {
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir);
    }

    /**
     * Returns promise of relativeMockPath
     */
    async #processMock(targetDirName, mockName, mockCells) {
        const mockFilename = mockName + '.txt';
        const mockPath = path.join(this.#destDir, targetDirName, mockFilename);
        const {data, rowCount} = this.#mockProcessor(mockCells);
        await this.#saveMock(mockPath, data);
        this.#emitMockProcessed({ name: mockFilename, rowCount });
        return `${targetDirName}/${mockFilename}`;
    }

    #saveMock(mockPath, data) {
        // Why not writeFileAsync ?
        return new Promise((resolve, reject) => {
            const fileStream = fs.createWriteStream(mockPath, 'utf8');
            fileStream.on('finish', resolve);
            fileStream.on('error', reject);
            fileStream.end(data);
        });
    }

    #emitMockProcessed({ name, rowCount }) {
        this.emit('mock-processed', { name, rowCount });
    }

    #calculateHash(blob) {
        if (this.#withHashing) {
            const hashObj = crypto.createHash('sha1');
            hashObj.update(blob);
            return hashObj.digest().toString('hex');
        } else {
            return '';
        }
    }
}

module.exports = ExcelFileManager;
