const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');
const assert = require('assert');
const crypto = require('crypto');
const { readFileAsync } = require('./utils/fs-utils');
const { slash } = require('./utils/fs-utils');

class ExcelFileManager extends EventEmitter {
    #fileHashMap;
    #mockList;
    #srcDir;
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
    constructor({srcDir, destDir, fileParser, mockProcessor, withHashing}) {
        super();
        assert(typeof destDir === 'string' && typeof fileParser === 'function' && typeof mockProcessor === 'function');
        this.#srcDir = srcDir;
        this.#destDir = destDir;
        this.#fileParser = fileParser;
        this.#mockProcessor = mockProcessor;
        this.#withHashing = withHashing;
        this.#validateParams();
        this.#initResults();
    }

    #validateParams() {
        if (!fs.existsSync(this.#srcDir)) throw Error('Source dir does not exist');
        if (!fs.existsSync(this.#destDir)) throw Error('Destination dir does not exist');
    }

    #initResults() {
        this.#fileHashMap = new Map();
        this.#mockList = new Set();
    }

    get fileHashMap() { return this.#fileHashMap }
    get mockList() { return [...this.#mockList] }
    get srcDir() { return this.#srcDir }

    async processDir() {
        let files = fs.readdirSync(this.#srcDir);
        files = files
            .filter(f => /\.xlsx$/.test(f))
            .filter(f => !f.startsWith('~'))
            .map(f => path.join(this.#srcDir, f));

        for (let f of files) {
            // await! to keep proper emit order (all mocks after one source file)
            await this.processOneFile(f);
        }
    }

    async processOneFile(filepath) {
        if (slash(path.dirname(filepath)) !== slash(this.#srcDir)) {
            throw Error(`Cannot process files from another directory: ${filepath}`);
        }

        const fileName = path.parse(filepath).name;
        const baseName = path.basename(filepath);
        this.#emitStartOfFileProcessing(baseName);

        try {
            const blob = await readFileAsync(filepath, 'binary');
            const hash = this.#calculateHash(blob);
            const parsedMocks = this.#fileParser(blob); /* { mock1: [{}], mock2: [{}], ... } */
            const targetDirName = fileName.toLowerCase();
            this.#proveDestDir(path.join(this.#destDir, targetDirName));

            const promises = [...Object.entries(parsedMocks)].map(([mockName, mockCells]) => this.#processMock(targetDirName, mockName, mockCells));
            const mockList = await Promise.all(promises);

            for (const m of mockList) this.#mockList.add(m);
            this.#fileHashMap.set(baseName, hash);

        } catch (error) {
            throw Object.assign(error, { _file: fileName });
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

    #emitStartOfFileProcessing(name) {
        this.emit('start-of-file-processing', { name });
    }

    #emitMockProcessed({ name, rowCount }) {
        this.emit('mock-processed', { name, rowCount });
    }

    #calculateHash(blob) {
        if (this.#withHashing) {
            const hashObj = crypto.createHash('sha1');
            hashObj.update(blob, 'binary');
            return hashObj.digest().toString('hex');
        } else {
            return null;
        }
    }
}

module.exports = ExcelFileManager;
