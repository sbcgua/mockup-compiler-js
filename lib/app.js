const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { Watcher } = require('./watcher');
const { copyDir, zipFiles } = require('./utils');
const FileProcessor = require('./file-processor');

class App {
    constructor(config, withWatcher) {
        this.withWatcher = withWatcher;
        this.sourceDir   = config.sourceDir;
        this.destDir     = config.destDir;
        this.zipPath     = config.zipPath;
        this.includes    = config.includes;
        this.eol         = config.eol;
        if (!fs.existsSync(this.sourceDir)) throw Error('Source dir does not exist');
    }

    async run() {
        const sourceFiles = this._collectSourceFiles();
        console.log(chalk.grey('Found files:'), `${sourceFiles.length}`);

        const fileProcessor = this._setupFileProcess();
        const dstCache      = await this._build(sourceFiles, fileProcessor);

        if (this.zipPath) {
            const archSize = await zipFiles(this.destDir, [...dstCache], this.zipPath);
            console.log(`\nArchiving complete. File size = ${archSize} bytes`);
        }
        if (this.withWatcher) {
            const watcher = new Watcher({...this, sourceFiles, fileProcessor});
            watcher.start(dstCache);
        }
    }

    async _build(sourceFiles, fileProcessor) {
        if (this.destDir && !fs.existsSync(this.destDir)) fs.mkdirSync(this.destDir);
        const dstFiles  = await this._processSourceDir(sourceFiles, fileProcessor);
        const dstAssets = this._copyIncludes();
        this._printStats(sourceFiles.length, dstFiles.length, dstAssets.length);
        return new Set([...dstFiles, ...dstAssets]);
    }

    _collectSourceFiles() {
        let files = fs.readdirSync(this.sourceDir);
        files = files
            .filter(f => /\.xlsx$/.test(f))
            .filter(f => !f.startsWith('~'))
            .map(f => path.join(this.sourceDir, f));

        return files;
    }

    _setupFileProcess() {
        const fileProcessor = new FileProcessor(this.destDir, this.eol);
        fileProcessor.on('mock-processed', ({name, rowCount}) => {
            console.log(chalk.green('  [OK]'), `${name} (${rowCount} rows)`);
        });
        return fileProcessor;
    }

    async _processSourceDir(sourceFiles, fileProcessor) {
        const dstFiles = [];
        for (let f of sourceFiles) {
            console.log(chalk.grey('Processing:'), `${path.basename(f)}`);
            const added = await fileProcessor.processFile(f);
            dstFiles.push(...added);
        }
        return dstFiles;
    }

    _copyIncludes() {
        if (!this.includes) return [];

        let dstAssets = [];
        for (let iDir of this.includes) {
            if (!fs.existsSync(iDir)) throw Error('Include dir does not exist: ' + iDir);
            let added = copyDir(iDir, this.destDir);
            added = added.map(i => path.relative(this.destDir, i).replace(/\\/g, '/'));
            dstAssets.push(...added);
        }
        return dstAssets;
    }

    _printStats(srcFileCount, dstFileCount, assetsCount) {
        console.log();
        console.log('-----------------------');
        console.log(chalk.grey('Processed files: '), `${srcFileCount}`);
        console.log(chalk.grey('Processed sheets:'), `${dstFileCount}`);
        console.log(chalk.grey('Added assets:    '), `${assetsCount}`);
    }

}

module.exports = App;
