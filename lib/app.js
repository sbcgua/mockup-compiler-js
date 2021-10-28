const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const Watcher = require('./watcher');
const MetaCalculator = require('./meta');
const { Zipper } = require('./utils/zip');
const ExcelFileManager = require('./excel-file-manager');
const IncludeFileManager = require('./include-file-manager');
const { createMockProcessor, parseExcelIntoMocks } = require('./mock-processings');

class App {
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
        this.#includeFileManager = this.#setupIncludeFileManager();
        this.#metaCalculator = new MetaCalculator({
            excelFileManager: this.#excelFileManager,
            includeFileManager: this.#includeFileManager,
            eol: config.eol,
        });
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
            withHashing: this.#withMeta,
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
            withHashing: this.#withMeta,
        });
        includeManager.on('include-processed', ({ name }) => {
            this.#logger.log(chalk.green('  [OK]'), `${name}`);
        });
        return includeManager;
    }

    async run() {
        await this.#excelFileManager.processDir();
        if (this.#includeFileManager) {
            this.#logger.log(chalk.grey('\nProcessing:'), 'Includes');
            await this.#includeFileManager.processDir();
        }
        this.#printStats();

        const allFiles = [
            ...this.#excelFileManager.mockList,
            ...(this.#includeFileManager ? [...this.#includeFileManager.fileHashMap.keys()] : []),
        ];
        if (this.#withMeta) {
            const metaDir = path.join(this.#destDir, this.#metaCalculator.metaDirName);
            if (!fs.existsSync(metaDir)) fs.mkdirSync(metaDir);
            allFiles.push(this.#metaCalculator.metaSrcFileName);
            const metaData = this.#metaCalculator.getSrcFilesMeta();
            fs.writeFileSync(path.join(this.#destDir, this.#metaCalculator.metaSrcFileName), metaData);
        }

        const zipper = this.#zipPath
            ? new Zipper({destDir: this.#destDir, zipPath: this.#zipPath})
            : null;
        if (this.#zipPath) {
            const archSize = await zipper.zipAsync(allFiles);
            this.#logger.log(`\nArchiving complete. File size = ${archSize} bytes`);
        }
        if (this.#withWatcher) {
            const watcher = new Watcher({
                logger: this.#logger,
                excelFileManager: this.#excelFileManager,
                includeFileManager: this.#includeFileManager,
                zipper
            });
            watcher.start();
        }
    }

    #printStats() {
        this.#logger.log();
        this.#logger.log('-----------------------');
        this.#logger.log(chalk.grey('Processed files: '), `${this.#excelFileManager.fileHashMap.size}`);
        this.#logger.log(chalk.grey('Processed sheets:'), `${this.#excelFileManager.mockList.length}`);
        this.#logger.log(chalk.grey('Added assets:    '), `${this.#includeFileManager.fileHashMap.size}`);
    }

}

module.exports = App;
