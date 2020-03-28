const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { zipFiles } = require('./utils');

class Watcher {
    constructor({ sourceDir, destDir, zipPath, sourceFiles, fileProcessor }) {
        this.sourceDir = sourceDir;
        this.destDir = destDir;
        this.zipPath = zipPath;
        this.fileMap = new Map(sourceFiles.map(f => [path.basename(f), f]));
        this.fileProcessor = fileProcessor;
        this.watcher = null;
        this.trottleLimit = 1000;
        this.dstCache = null;
    }

    start(dstCache) {
        this.dstCache = new Set(dstCache);
        this._initWatcher();
        this._connectStdin();
        console.log();
        console.log(chalk.yellowBright('Watching source dir:'), `${this.sourceDir}`);
        if (process.stdout.isTTY) {
            console.log('To exit - press q, ctrl-d or ctrl-c');
        }
        else {
            console.log('To exit - press ctrl-c');
        }
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
        const added = await this.fileProcessor.processFile(filepath);
        for (let i of added) this.dstCache.add(i);
        if (this.zipPath) {
            const archSize = await zipFiles(this.destDir, [...this.dstCache], this.zipPath);
            console.log(chalk.green('  [>>]'), `Archiving complete. File size = ${archSize} bytes`);
        }
    }

    _connectStdin() {
        if (!process.stdout.isTTY) return;
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

exports.Watcher = Watcher;
