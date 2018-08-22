const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { copyDir } = require('./utils');
const archiver = require('archiver');
const FileProcessor = require('./file-processor');

class Watcher {
    constructor({sourceDir, destDir, zipPath,  sourceFiles, fileProcessor}) {
        this.sourceDir     = sourceDir;
        this.destDir       = destDir;
        this.zipPath       = zipPath;
        this.fileMap       = new Map(sourceFiles.map(f => [path.basename(f), f]));
        this.fileProcessor = fileProcessor;
        this.watcher       = null;
        this.trottleLimit  = 1000;
        this.dstCache      = null;
    }

    start(dstCache) {
        this.dstCache = new Set(dstCache);
        this._initWatcher();
        this._connectStdin();

        console.log();
        console.log(chalk.yellowBright('Watching source dir:'), `${this.sourceDir}`);
        console.log('To exit - press q, ctrl-d or ctrl-c');
        console.log();
    }

    _initWatcher() {
        let lastChange = 0;
        let lastHandlerComplete = true;
        this.watcher = fs.watch(this.sourceDir, (eventType, filename) => {
            if (eventType !== 'change' || !this.fileMap.has(filename)) return;
            const now = Date.now();
            if ((now - lastChange) > this.trottleLimit && lastHandlerComplete) {
                lastHandlerComplete = false;
                lastChange = now;
                this._reportChange(now, filename);
                this._handleChange(now, filename).then(() => { lastHandlerComplete = true });
            }
        });
    }

    _reportChange(now, filename) {
        console.log();
        const nowFormatted = (new Date(now)).toISOString().substr(0, 19).replace('T', ' ');
        console.log(chalk.blue(`[${nowFormatted}]`), chalk.grey('Change detected:'), chalk.blue(`${filename}`));
    }

    async _handleChange(now, filename) {
        const filepath = this.fileMap.get(filename);
        const added    = await this.fileProcessor.processFile(filepath);
        for (let i of added) this.dstCache.add(i);
        if (this.zipPath) {
            const archSize = await zipFiles(this.destDir, [...this.dstCache], this.zipPath);
            console.log(chalk.green('  [>>]'), `Archiving complete. File size = ${archSize} bytes`);
        }
    }

    _connectStdin() {
        process.stdin.resume();
        process.stdin.setRawMode(true);
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', (chunk) => {
            if (['q', '\u0003', '\u0004'].includes(chunk)) {
                console.log('Exiting...');
                this.watcher.close();
                process.exit(0);
            }
        });
    }
}

async function zipFiles(rootDir, fileList, zipPath) {
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => resolve(archive.pointer()));
        archive.on('warning', (err) => reject(Object.assign(err, { _loc: 'zipFiles warning' })));
        archive.on('error', (err) => reject(Object.assign(err, { _loc: 'zipFiles error' })));
        archive.pipe(output);
        for (let name of fileList) archive.file(path.join(rootDir, name), { name });
        archive.finalize();
    });
}

class App {
    constructor(config, withWatcher) {
        this.withWatcher = withWatcher;
        this.sourceDir   = config.sourceDir;
        this.destDir     = config.destDir;
        this.zipPath     = config.zipPath;
        this.includes    = config.includes;
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
        const fileProcessor = new FileProcessor(this.destDir);
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
