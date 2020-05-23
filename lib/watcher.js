const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { zipFiles } = require('./utils/zip');

class Watcher {
    constructor({ logger, sourceDir, destDir, zipPath, sourceFiles, fileProcessor }) {
        this.sourceDir = sourceDir;
        this.destDir = destDir;
        this.zipPath = zipPath;
        this.fileMap = new Map(sourceFiles.map(f => [path.basename(f), f]));
        this.fileProcessor = fileProcessor;
        this.watcher = null;
        this.trottleLimit = 1000;
        this.dstCache = null;
        this.logger = logger;
    }

    start(dstCache) {
        this.dstCache = new Set(dstCache);
        this._initWatcher();
        this._connectStdin();
        this.logger.log();
        this.logger.log(chalk.yellowBright('Watching source dir:'), `${this.sourceDir}`);
        if (process.stdout.isTTY) {
            this.logger.log('To exit - press q, ctrl-d or ctrl-c');
        }
        else {
            this.logger.log('To exit - press ctrl-c');
        }
        this.logger.log();
    }

    _initWatcher() {
        this.watcher = fs.watch(this.sourceDir, this._createEventHandler());
    }

    _createEventHandler() {
        let lastChange = 0;
        let lastHandlerComplete = true;
        return async (eventType, filename) => {
            if (eventType !== 'change' || !this.fileMap.has(filename)) return;

            const now = Date.now();
            if ((now - lastChange) > this.trottleLimit && lastHandlerComplete) {
                lastHandlerComplete = false;
                lastChange = now;
                this._reportChange(now, filename);
                await this._handleChange(now, filename);
                lastHandlerComplete = true;
            }
        };
    }

    _reportChange(now, filename) {
        this.logger.log();
        const nowFormatted = (new Date(now)).toISOString().substr(0, 19).replace('T', ' ');
        this.logger.log(chalk.blue(`[${nowFormatted}]`), chalk.grey('Change detected:'), chalk.blue(`${filename}`));
    }

    async _handleChange(now, filename) {
        const filepath = this.fileMap.get(filename);
        const added = await this.fileProcessor.processFile(filepath);
        for (let i of added) this.dstCache.add(i);
        if (this.zipPath) {
            const archSize = await zipFiles(this.destDir, [...this.dstCache], this.zipPath);
            this.logger.log(chalk.green('  [>>]'), `Archiving complete. File size = ${archSize} bytes`);
        }
    }

    _connectStdin() {
        if (!process.stdout.isTTY) return;
        process.stdin.resume();
        process.stdin.setRawMode(true);
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', (chunk) => {
            if (['q', '\u0003', '\u0004'].includes(chunk)) {
                this.logger.log('Exiting...');
                this.watcher.close();
                process.exit(0);
            }
        });
    }
}

module.exports = Watcher;
