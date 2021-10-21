const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const Watcher = require('./watcher');
const { copyDir } = require('./utils/fs-utils');
const { zipFiles } = require('./utils/zip');
const ExcelFilePipeline = require('./excel-file-manager');
const { createMockProcessor, parseExcelIntoMocks } = require('./mock-processings');

class App {
    constructor(config, withWatcher) {
        this.withWatcher = withWatcher;
        this.sourceDir   = config.sourceDir;
        this.destDir     = config.destDir;
        this.zipPath     = config.zipPath;
        this.includes    = config.includes;
        this.logger      = config.logger;
        if (!fs.existsSync(this.sourceDir)) throw Error('Source dir does not exist');
        this.excelFileProcessor = this._setupExcelFileProcessor(config.eol);
    }

    _setupExcelFileProcessor(eol) {
        const fileProcessor = new ExcelFilePipeline({
            destRoot: this.destDir,
            fileParser: parseExcelIntoMocks,
            mockProcessor: createMockProcessor(eol),
        });
        fileProcessor.on('mock-processed', ({name, rowCount}) => {
            this.logger.log(chalk.green('  [OK]'), `${name} (${rowCount} rows)`);
        });
        return fileProcessor;
    }

    async run() {
        const sourceExcelFiles = this._collectSourceFiles();
        this.logger.log(chalk.grey('Found files:'), `${sourceExcelFiles.length}`);

        if (this.destDir && !fs.existsSync(this.destDir)) fs.mkdirSync(this.destDir);

        const {compiledMockFiles, excelFileHashes} = await this._processMockDir(sourceExcelFiles);
        const {includedFiles, includedFileHashes} = this._copyIncludes();
        this._printStats({
            srcExcelFileCount: sourceExcelFiles.length,
            dstMockFileCount: compiledMockFiles.length,
            includedFileCount: includedFiles.length,
        });

        console.log(excelFileHashes, includedFileHashes);

        if (this.zipPath) {
            const archSize = await zipFiles(this.destDir, [...compiledMockFiles, ...includedFiles], this.zipPath);
            this.logger.log(`\nArchiving complete. File size = ${archSize} bytes`);
        }
        if (this.withWatcher) {
            const watcher = new Watcher({...this, sourceFiles: sourceExcelFiles, fileProcessor: this.excelFileProcessor});
            watcher.start(new Set([...compiledMockFiles, ...includedFiles]));
        }
    }

    _collectSourceFiles() {
        let files = fs.readdirSync(this.sourceDir);
        files = files
            .filter(f => /\.xlsx$/.test(f))
            .filter(f => !f.startsWith('~'))
            .map(f => path.join(this.sourceDir, f));

        return files;
    }

    async _processMockDir(sourceFiles) {
        const compiledMockFiles = [];
        const excelFileHashes = [];
        for (let f of sourceFiles) {
            this.logger.log(chalk.grey('Processing:'), `${path.basename(f)}`);
            const { mockList, sourceFileHash } = await this.excelFileProcessor.processFile(f);
            compiledMockFiles.push(...mockList);
            excelFileHashes.push([f, sourceFileHash]);
        }
        return { compiledMockFiles, excelFileHashes };
    }

    _copyIncludes() {
        const includedFiles = [];
        const includedFileHashes = [];
        const includeDirs = [];
        for (let dir of (this.includes || [])) {
            if (!fs.existsSync(dir)) throw Error('Include dir does not exist: ' + dir);
            let addedFiles = copyDir(dir, this.destDir);
            addedFiles = addedFiles.map(i => path.relative(this.destDir, i).replace(/\\/g, '/'));
            includedFiles.push(...addedFiles);
        }
        return {includedFiles, includedFileHashes, includeDirs};
    }

    _printStats({srcExcelFileCount, dstMockFileCount, includedFileCount}) {
        this.logger.log();
        this.logger.log('-----------------------');
        this.logger.log(chalk.grey('Processed files: '), `${srcExcelFileCount}`);
        this.logger.log(chalk.grey('Processed sheets:'), `${dstMockFileCount}`);
        this.logger.log(chalk.grey('Added assets:    '), `${includedFileCount}`);
    }

}

module.exports = App;
