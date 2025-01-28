import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert';
import crypto from 'node:crypto';
import { readFile as readFileAsync } from 'node:fs/promises';
import { read as readXLSX } from 'xlsx';
import { slash } from '../utils/fs-utils.js';
import { FileManagerBase } from './file-manager-base.js';

const START_OF_FILE_PROCESSING = 'start-of-file-processing';
const ITEM_PROCESSED = 'item-processed';

export default class ExcelFileManager extends FileManagerBase {
    #srcDir;
    #destDir;
    #withHashing = false;
    #mockExtractor;
    #mockProcessor;
    #fileHashMap = new Map();
    #mockList = new Set();

    get fileHashMap() { return this.#fileHashMap }
    get testObjectList() { return [...this.#mockList] }
    get srcDirs() { return [this.#srcDir] }

    /**
     * Create File pipeline
     * @param {string} srcDir source folder
     * @param {string} destDir destination folder
     * @param {boolean} withHashing enable hashing
     * @param {Function} mockExtractor file parsing routine
     * @param {Function} mockProcessor single mock processing routine
     */
    constructor({srcDir, destDir, withHashing, mockExtractor, mockProcessor}) {
        assert(typeof destDir === 'string' && typeof mockExtractor === 'function' && typeof mockProcessor === 'function');
        super();
        this.#srcDir = srcDir;
        this.#destDir = destDir;
        this.#withHashing = withHashing;

        this.#mockExtractor = mockExtractor;
        this.#mockProcessor = mockProcessor;
        this.#validateParams();
    }

    #validateParams() {
        if (!fs.existsSync(this.#srcDir)) throw Error('Source dir does not exist');
        if (!fs.existsSync(this.#destDir)) throw Error('Destination dir does not exist');
    }

    async processAll() {
        if (this.#fileHashMap.size > 0) throw Error('Cannot processAll twice');

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
        assert(typeof filepath === 'string');
        if (slash(path.dirname(filepath)) !== slash(this.#srcDir)) {
            throw Error(`Cannot process files from another directory: ${filepath}`);
        }

        const fileName = path.parse(filepath).name;
        const baseName = path.basename(filepath);
        this.#emitStartOfFileProcessing(baseName);

        try {
            const blob = await readFileAsync(filepath, 'binary');
            const hash = this.#calculateHash(blob);
            const wb = readXLSX(blob, { type: 'binary' });
            const parsedMocks = this.#mockExtractor(wb); /* { mock1: [{}], mock2: [{}], ... } */
            const targetDirName = fileName.toLowerCase();
            this.#proveDestDir(path.join(this.#destDir, targetDirName));

            const mockNames = await this.#processParsedMocks(parsedMocks, fileName, targetDirName);

            mockNames.forEach(m => this.#mockList.add(m));
            this.#fileHashMap.set(baseName, hash);

        } catch (error) {
            throw Object.assign(error, { _file: fileName });
        }
    }

    async #processParsedMocks(parsedMocks, fileName, targetDirName) {
        const promises = [...Object.entries(parsedMocks)]
            .map(([mockName, mockCells]) => {
                Object.defineProperty(mockCells, '__filename__', { value: fileName, enumerable: false });
                Object.defineProperty(mockCells, '__sheet__', { value: mockName, enumerable: false });
                return [mockName, mockCells];
            })
            .map(([mockName, mockCells]) => this.#processMock(targetDirName, mockName, mockCells));
            // TODO merge with #processMock, externalize Saving (and targetDirname) ?
        return await Promise.all(promises);
    }

    #proveDestDir(destDir) {
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir);
    }

    async #processMock(targetDirName, mockName, mockCells) {
        const {data, rowCount} = this.#mockProcessor(mockCells);
        const mockFilename = mockName + '.txt';
        const mockPath = path.join(this.#destDir, targetDirName, mockFilename);
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
        this.emit(START_OF_FILE_PROCESSING, { name });
    }

    #emitMockProcessed({ name, rowCount }) {
        this.emit(ITEM_PROCESSED, { name, rowCount });
    }

    #calculateHash(blob) {
        if (!this.#withHashing) return undefined;
        const hashObj = crypto.createHash('sha1');
        hashObj.update(blob, 'binary');
        return hashObj.digest().toString('hex');
    }
}
