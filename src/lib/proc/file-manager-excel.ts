import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert';
import crypto from 'node:crypto';
import { readFile as readFileAsync } from 'node:fs/promises';
import picomatch from 'picomatch';
import { read as readXLSX } from 'xlsx';

import { slash } from '../utils/fs-utils.ts';
import SimpleSHA1Stream from '../utils/sha1-stream.ts';
import { FileManagerBase } from './file-manager-base.ts';
import type {
    FileManagerProcessedItemEvent,
    FileProcessingStartedEvent,
    MockExtractor,
    MockProcessor,
    MockTable,
    WritableFsLike,
    WorkbookLike,
    WorkbookMocks,
} from '../types';

const START_OF_FILE_PROCESSING = 'start-of-file-processing';
const ITEM_PROCESSED = 'item-processed';

type ExcelFileManagerParams = {
    srcDir: string;
    destDir: string;
    withHashing?: boolean;
    mockExtractor: MockExtractor;
    mockProcessor: MockProcessor;
    pattern?: string[];
    memfs?: WritableFsLike;
};

type ProcessingError = Error & { _file?: string };

export default class ExcelFileManager extends FileManagerBase {
    #srcDir: string;
    #destDir: string;
    #withHashing: boolean;
    #mockExtractor: MockExtractor;
    #mockProcessor: MockProcessor;
    #fileHashMap = new Map<string, string | undefined>();
    #mockHashMap = new Map<string, string | undefined>();
    #mockList = new Set<string>();
    #pattern: string[];
    #destFs: WritableFsLike;

    get fileHashMap(): Map<string, string | undefined> { return this.#fileHashMap }
    get mockHashMap(): Map<string, string | undefined> { return this.#mockHashMap }
    get testObjectList(): string[] { return [...this.#mockList] }
    get srcDirs(): string[] { return [this.#srcDir] }

    constructor({ srcDir, destDir, withHashing = false, mockExtractor, mockProcessor, pattern, memfs }: ExcelFileManagerParams) {
        assert(typeof destDir === 'string' && typeof mockExtractor === 'function' && typeof mockProcessor === 'function');
        super();
        this.#srcDir = srcDir;
        this.#destDir = destDir;
        this.#withHashing = withHashing;
        this.#destFs = memfs || fs;
        this.#mockExtractor = mockExtractor;
        this.#mockProcessor = mockProcessor;
        this.#pattern = pattern || ['*.xlsx'];
        this.#validateParams();
    }

    #validateParams(): void {
        if (!fs.existsSync(this.#srcDir)) throw Error('Source dir does not exist');
        if (!this.#destFs.existsSync(this.#destDir)) throw Error('Destination dir does not exist');
    }

    isFileRelevant(filepath: string): boolean {
        assert(typeof filepath === 'string');
        return picomatch.isMatch(filepath, this.#pattern) && !filepath.startsWith('~');
    }

    async processAll(): Promise<void> {
        if (this.#fileHashMap.size > 0) throw Error('Cannot processAll twice');

        const files = fs.readdirSync(this.#srcDir)
            .filter(fileName => this.isFileRelevant(fileName))
            .map(fileName => path.join(this.#srcDir, fileName));

        for (const filePath of files) {
            await this.processOneFile(filePath);
        }
    }

    async processOneFile(filepath: string): Promise<void> {
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
            const wb = readXLSX(blob, { type: 'binary' }) as WorkbookLike;
            const parsedMocks = this.#mockExtractor(wb);
            const targetDirName = fileName.toLowerCase();
            this.#proveDestDir(path.join(this.#destDir, targetDirName));

            const mockNames = await this.#processParsedMocks(parsedMocks, targetDirName);
            mockNames.forEach(mockName => this.#mockList.add(mockName));
            this.#fileHashMap.set(baseName, hash);
        } catch (error) {
            throw Object.assign(error as ProcessingError, { _file: fileName });
        }
    }

    async #processParsedMocks(parsedMocks: WorkbookMocks, targetDirName: string): Promise<string[]> {
        const promises = Object.entries(parsedMocks)
            .map(([mockName, mockCells]) => this.#processMock(targetDirName, mockName, mockCells));
        return await Promise.all(promises);
    }

    #proveDestDir(destDir: string): void {
        if (!this.#destFs.existsSync(destDir)) this.#destFs.mkdirSync(destDir);
    }

    async #processMock(targetDirName: string, mockName: string, mockCells: MockTable): Promise<string> {
        const { data, rowCount } = this.#mockProcessor(mockCells);
        const mockFilename = `${mockName}.txt`;
        const mockPath = path.join(this.#destDir, targetDirName, mockFilename);
        const hash = await this.#saveMock(mockPath, data);
        this.#mockHashMap.set(`@${targetDirName}/${mockName}`, hash);
        this.#emitMockProcessed({ name: mockFilename, rowCount });
        return `${targetDirName}/${mockFilename}`;
    }

    #saveMock(mockPath: string, data: string): Promise<string | undefined> {
        return new Promise((resolve, reject) => {
            const sha1s = this.#withHashing ? new SimpleSHA1Stream() : null;
            const ws = this.#destFs.createWriteStream(mockPath, 'utf8');
            ws.on('finish', () => resolve(sha1s?.digest()));
            ws.on('error', reject);
            if (sha1s) {
                sha1s.pipe(ws);
                sha1s.end(data);
            } else {
                ws.end(data);
            }
        });
    }

    #emitStartOfFileProcessing(name: string): void {
        const payload: FileProcessingStartedEvent = { name };
        this.emit(START_OF_FILE_PROCESSING, payload);
    }

    #emitMockProcessed(payload: FileManagerProcessedItemEvent): void {
        this.emit(ITEM_PROCESSED, payload);
    }

    #calculateHash(blob: string): string | undefined {
        if (!this.#withHashing) return undefined;
        const hashObj = crypto.createHash('sha1');
        hashObj.update(blob, 'binary');
        return hashObj.digest().toString('hex');
    }
}
