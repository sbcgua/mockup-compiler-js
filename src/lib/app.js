import fs from 'node:fs';
import chalk from 'chalk';
import Watcher from './watcher.js';
import MetaCalculator from './proc/meta.js';
import { Bundler } from './utils/bundler.js';
import { zipFiles } from './utils/zip.js';
import { buildTextBundle, buildTextZipBundle } from './utils/mc-text-format.js';
import ExcelFileManager from './proc/file-manager-excel.js';
import IncludeFileManager from './proc/file-manager-includes.js';
import { createMockProcessor, parseWokbookIntoMocks } from './proc/mock-processings.js';
import { fs as memfs, vol as memVol } from 'memfs';

export default class App {
    #logger;

    #excelFileManager;
    #includeFileManager;
    #metaCalculator;
    #bundler;
    #watcher;

    #withMeta;
    #inMemory = false;

    constructor(config, withWatcher) {
        this.#logger      = config.logger;
        this.#withMeta    = config.withMeta;
        this.#inMemory    = config.inMemory;

        let destDir = config.destDir;

        if (this.#inMemory) {
            if (destDir) throw Error('"inMemory" mode cannot be used with "destDir"');
            destDir = '/'; // in-memory root dir
        }

        this.#initDestDir(destDir, {
            cleanDestDirOnStart: config.cleanDestDirOnStart,
        });
        this.#excelFileManager = this.#setupExcelFileManager({
            srcDir: config.sourceDir,
            destDir,
            eol: config.eol,
            skipFieldsStartingWith: config.skipFieldsStartingWith,
            pattern: config.pattern,
        });
        this.#includeFileManager = this.#setupIncludeFileManager({
            destDir,
            includes: config.includes,
        });
        this.#metaCalculator = this.#setupMetaCalculator({
            eol: config.eol,
            destDir,
        });
        this.#bundler = this.#setupBundler({
            noBundle: config.noBundle,
            bundleFormat: config.bundleFormat,
            destDir,
            bundlePath: config.bundlePath,
        });
        this.#watcher = this.#setupWatcher({
            withWatcher,
        });
    }

    #initDestDir(destDir, {cleanDestDirOnStart}) {
        if (this.#inMemory) {
            memVol.reset();
        } else {
            if (fs.existsSync(destDir)) {
                if (cleanDestDirOnStart) {
                    this.#logger.log(chalk.grey('Removing dest dir'), destDir);
                    fs.rmdirSync(destDir, { recursive: true, force: true });
                    fs.mkdirSync(destDir);
                }
            } else {
                fs.mkdirSync(destDir);
            }
        }
    }

    #setupExcelFileManager({eol, skipFieldsStartingWith, pattern, srcDir, destDir}) {
        const fileProcessor = new ExcelFileManager({
            srcDir,
            destDir,
            mockExtractor: parseWokbookIntoMocks,
            mockProcessor: createMockProcessor(eol, skipFieldsStartingWith),
            withHashing: this.#withMeta,
            pattern,
            memfs: this.#inMemory ? memfs : undefined,
        });
        fileProcessor.on('start-of-file-processing', ({name}) => {
            this.#logger.log(chalk.grey('Processing:'), `${name}`);
        });
        fileProcessor.on('item-processed', ({name, rowCount}) => {
            this.#logger.log(chalk.green('  [OK]'), `${name} (${rowCount} rows)`);
        });
        return fileProcessor;
    }

    #setupIncludeFileManager({destDir, includes}) {
        if (!includes || includes.length === 0) return;
        if (includes.length > 1) {
            throw Error('Multiple includes is not supported curently, please log an issue if you need this feature');
        }

        const includeManager = new IncludeFileManager({
            includeDir: includes[0],
            destDir,
            withHashing: this.#withMeta,
            memfs: this.#inMemory ? memfs : undefined,
        });
        includeManager.on('item-processed', ({ name }) => {
            this.#logger.log(chalk.green('  [OK]'), `${name}`);
        });
        return includeManager;
    }

    #setupMetaCalculator({ eol, destDir }) {
        if (!this.#withMeta) return;
        return new MetaCalculator({
            excelFileManager: this.#excelFileManager,
            includeFileManager: this.#includeFileManager,
            destDir,
            eol,
            memfs: this.#inMemory ? memfs : undefined,
        });
    }

    #chooseBundleFormat(bundleFormat) {
        switch (bundleFormat) {
            case 'text': return buildTextBundle;
            case 'text+zip': return buildTextZipBundle;
            case 'zip': return zipFiles;
            default: throw new Error(`Unsupported bundle format: ${bundleFormat}`);
        }
    }

    #setupBundler({ noBundle, bundleFormat, destDir, bundlePath }) {
        if (!bundlePath || bundlePath === '') return;
        if (noBundle) return;

        return new Bundler({
            sourceDir: destDir, // sourceDir is the uncompressed dir
            memfs: this.#inMemory ? memfs : undefined,
            bundlePath,
            bundleFn: this.#chooseBundleFormat(bundleFormat),
        });
    }

    #setupWatcher({ withWatcher }) {
        if (!withWatcher) return;
        return new Watcher({
            logger: this.#logger,
            excelFileManager: this.#excelFileManager,
            includeFileManager: this.#includeFileManager,
            metaCalculator: this.#metaCalculator,
            bundler: this.#bundler,
        });
    }

    async run() {
        await this.#processFiles();
        this.#printStats();

        if (this.#metaCalculator) {
            await this.#metaCalculator.buildAndSave();
        }

        if (this.#inMemory) {
            this.#logger.log(chalk.blue('\nIn-memory file system tree:'));
            console.log(chalk.grey(memVol.toTree()));
            console.log();
        }

        if (this.#bundler) {
            await this.#createBundle();
        }

        if (this.#watcher) {
            this.#watcher.start();
        }
    }

    async #processFiles() {
        await this.#excelFileManager.processAll();
        if (this.#includeFileManager) {
            this.#logger.log(chalk.grey('\nProcessing:'), 'Includes');
            await this.#includeFileManager.processAll();
        }
    }

    async #createBundle() {
        const completefileList = [
            ...this.#excelFileManager.testObjectList,
            ...(this.#includeFileManager ? this.#includeFileManager.testObjectList : []),
            ...(this.#metaCalculator ? [this.#metaCalculator.metaSrcFileName] : []),
        ];
        const archSize = await this.#bundler.bundle(completefileList);
        this.#logger.log(`\nBundle ready. File size = ${archSize} bytes`);
        this.#logger.log(this.#bundler.bundlePath);
    }

    #printStats() {
        this.#logger.log();
        this.#logger.log('-----------------------');
        this.#logger.log(chalk.grey('Processed files: '), `${this.#excelFileManager.fileHashMap.size}`);
        this.#logger.log(chalk.grey('Processed sheets:'), `${this.#excelFileManager.testObjectList.length}`);
        if (this.#includeFileManager) {
            this.#logger.log(chalk.grey('Added assets:    '), `${this.#includeFileManager.fileHashMap.size}`);
        }
    }

}
