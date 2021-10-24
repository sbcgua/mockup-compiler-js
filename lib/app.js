const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const Watcher = require('./watcher');
const { copyDir } = require('./utils/fs-utils');
const { zipFiles } = require('./utils/zip');
const ExcelFileManager = require('./excel-file-manager');
const IncludeFileManager = require('./include-file-manager');
const { createMockProcessor, parseExcelIntoMocks } = require('./mock-processings');

class App {
    #excelFileManager;
    #inlcludeFileManager;
    #withWatcher;
    #srcDir;
    #destDir;
    #zipPath;
    #includes;
    #logger;
    #withMeta;

    constructor(config, withWatcher) {
        this.#withWatcher = withWatcher;
        this.#srcDir      = config.sourceDir;
        this.#destDir     = config.destDir; // needed as attr?
        this.#zipPath     = config.zipPath;
        this.#includes    = config.includes; // TODO make single include dir?
        this.#logger      = config.logger;
        this.#withMeta    = config.withMeta;

        this.#proveParamsAndDirs();
        this.#excelFileManager = this.#setupExcelFileManager(config.eol);
        this.#inlcludeFileManager = this.#setupIncludeFileManager();
    }

    #proveParamsAndDirs() {
        // TODO check includedir! Or remove the check at all
        // check destDir not empty
        if (!fs.existsSync(this.#srcDir)) throw Error('Source dir does not exist');
        if (this.#destDir && !fs.existsSync(this.#destDir)) fs.mkdirSync(this.#destDir);

    }

    #setupExcelFileManager(eol) {
        const fileProcessor = new ExcelFileManager({
            srcDir: this.#srcDir,
            destDir: this.#destDir,
            fileParser: parseExcelIntoMocks,
            mockProcessor: createMockProcessor(eol),
        });
        fileProcessor.on('start-of-file-processing', ({name}) => {
            this.#logger.log(chalk.grey('Processing:'), `${name}`);
        });
        fileProcessor.on('mock-processed', ({name, rowCount}) => {
            this.#logger.log(chalk.green('  [OK]'), `${name} (${rowCount} rows)`);
        });
        return fileProcessor;
    }

    #setupIncludeFileManager() {
        if (!this.#includes || this.#includes.length === 0) return;
        // support just one include dir for now ???
        const includeManager = new IncludeFileManager({
            includeDir: this.#includes[0],
            destDir: this.#destDir,
        });
        includeManager.on('include-processed', ({ name }) => {
            this.#logger.log(chalk.green('  [OK]'), `${name}`);
        });
        return includeManager;
    }

    async run() {
        await this.#excelFileManager.processDir();
        if (this.#inlcludeFileManager) {
            this.#logger.log(chalk.grey('Processing Include dir'));
            await this.#inlcludeFileManager.processDir();
        }
        this._printStats();

        if (this.#withMeta) {
            // TODO meta
        }

        // if (this.zipPath) {
        //     const archSize = await zipFiles(this.destDir, [...compiledMockFiles, ...includedFiles], this.zipPath);
        //     this.logger.log(`\nArchiving complete. File size = ${archSize} bytes`);
        // }
        // if (this.withWatcher) {
        //     const watcher = new Watcher({...this, sourceFiles: sourceExcelFiles, fileProcessor: this.excelFileManager});
        //     watcher.start(new Set([...compiledMockFiles, ...includedFiles]));
        // }
    }

    _printStats() {
        this.#logger.log();
        this.#logger.log('-----------------------');
        this.#logger.log(chalk.grey('Processed files: '), `${this.#excelFileManager.fileHashMap.size}`);
        this.#logger.log(chalk.grey('Processed sheets:'), `${this.#excelFileManager.mockList.length}`);
        this.#logger.log(chalk.grey('Added assets:    '), `${this.#inlcludeFileManager.fileHashMap.size}`);
    }

}

module.exports = App;
