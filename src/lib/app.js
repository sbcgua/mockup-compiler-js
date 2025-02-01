import fs from 'node:fs';
import chalk from 'chalk';
import Watcher from './watcher.js';
import MetaCalculator from './proc/meta.js';
import { Bundler } from './utils/bundler.js';
import { zipFiles } from './utils/zip.js';
import { buildTextBundle } from './utils/mc-text-format.js';
import ExcelFileManager from './proc/file-manager-excel.js';
import IncludeFileManager from './proc/file-manager-includes.js';
import { createMockProcessor, parseWokbookIntoMocks } from './proc/mock-processings.js';

export default class App {
    #excelFileManager;
    #includeFileManager;
    #withWatcher;
    #srcDir;
    #destDir;
    #zipPath;
    #includes;
    #logger;
    #withMeta;
    #metaCalculator;
    #bundler;

    constructor(config, withWatcher) {
        this.#withWatcher = withWatcher;
        this.#srcDir      = config.sourceDir;
        this.#destDir     = config.destDir;
        this.#zipPath     = config.zipPath;
        this.#includes    = config.includes;
        this.#logger      = config.logger;
        this.#withMeta    = config.withMeta;

        this.#initDestDir({ cleanDestDirOnStart: config.cleanDestDirOnStart });
        this.#excelFileManager = this.#setupExcelFileManager({
            eol: config.eol,
            skipFieldsStartingWith: config.skipFieldsStartingWith,
        });
        this.#includeFileManager = this.#setupIncludeFileManager();
        this.#metaCalculator = this.#withMeta && new MetaCalculator({
            excelFileManager: this.#excelFileManager,
            includeFileManager: this.#includeFileManager,
            destDir: this.#destDir,
            eol: config.eol,
        });
        this.#bundler = this.#zipPath && !config.suppressZip && new Bundler({
            uncompressedDir: this.#destDir,
            bundlePath: this.#zipPath,
            bundlerFn: config.bundleFormat === 'text' ? buildTextBundle : zipFiles,
        });
    }

    #initDestDir({cleanDestDirOnStart}) {
        if (fs.existsSync(this.#destDir)) {
            if (cleanDestDirOnStart) {
                this.#logger.log(chalk.grey('Removing dest dir'), this.#destDir);
                fs.rmdirSync(this.#destDir, { recursive: true, force: true });
                fs.mkdirSync(this.#destDir);
            }
        } else {
            fs.mkdirSync(this.#destDir);
        }
    }

    #setupExcelFileManager({eol, skipFieldsStartingWith}) {
        const fileProcessor = new ExcelFileManager({
            srcDir: this.#srcDir,
            destDir: this.#destDir,
            mockExtractor: parseWokbookIntoMocks,
            mockProcessor: createMockProcessor(eol, skipFieldsStartingWith),
            withHashing: this.#withMeta,
        });
        fileProcessor.on('start-of-file-processing', ({name}) => {
            this.#logger.log(chalk.grey('Processing:'), `${name}`);
        });
        fileProcessor.on('item-processed', ({name, rowCount}) => {
            this.#logger.log(chalk.green('  [OK]'), `${name} (${rowCount} rows)`);
        });
        return fileProcessor;
    }

    #setupIncludeFileManager() {
        if (!this.#includes || this.#includes.length === 0) return;
        if (this.#includes.length > 1) {
            throw Error('Multiple includes is not supported curently, please log an issue if you need this feature');
        }

        const includeManager = new IncludeFileManager({
            includeDir: this.#includes[0],
            destDir: this.#destDir,
            withHashing: this.#withMeta,
        });
        includeManager.on('item-processed', ({ name }) => {
            this.#logger.log(chalk.green('  [OK]'), `${name}`);
        });
        return includeManager;
    }

    async run() {
        await this.#processFiles();
        this.#printStats();

        if (this.#metaCalculator) {
            this.#metaCalculator.buildAndSave();
        }

        if (this.#bundler) {
            await this.#createBundle();
        }

        if (this.#withWatcher) {
            this.#startWatcher();
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
        const archSize = await this.#bundler.bundle([
            ...this.#excelFileManager.testObjectList,
            ...(this.#includeFileManager ? this.#includeFileManager.testObjectList : []),
            ...(this.#withMeta ? [this.#metaCalculator.metaSrcFileName] : []),
        ]);
        this.#logger.log(`\nArchiving complete. File size = ${archSize} bytes`);
    }

    #startWatcher() {
        const watcher = new Watcher({
            logger: this.#logger,
            excelFileManager: this.#excelFileManager,
            includeFileManager: this.#includeFileManager,
            metaCalculator: this.#metaCalculator,
            bundler: this.#bundler,
        });
        watcher.start();
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
