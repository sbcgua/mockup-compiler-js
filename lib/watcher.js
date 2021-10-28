const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// TODO
// meta update
// zip

class Watcher {
    #logger;
    #excelFileManager;
    #includeFileManager;
    #trottleLimit;
    #watchers = [];
    #watchedDirs = [];
    #zipper;

    constructor({ logger, excelFileManager, includeFileManager, zipper }) {
        this.#logger = logger;
        this.#zipper = zipper;
        this.#excelFileManager = excelFileManager;
        this.#includeFileManager = includeFileManager;
        this.#trottleLimit = 1000;
    }

    start() {
        // this.dstCache = new Set(dstCache);
        this.#initWatchers();
        this.#connectStdin();
        this.#printStartBanner();
    }

    close() {
        for (const w of this.#watchers) w.close();
    }

    #initWatchers() {
        const mockDir = this.#excelFileManager.srcDir;
        this.#watchers.push(fs.watch(mockDir, this.#createEventHandler(mockDir, false)));
        this.#watchedDirs.push(mockDir);

        if (this.#includeFileManager) {
            for (const iDir of this.#includeFileManager.includeDirs) {
                this.#watchers.push(fs.watch(iDir, this.#createEventHandler(iDir, true)));
                this.#watchedDirs.push(iDir);
            }
        }
    }

    #createEventHandler(dir, isInclude) {
        let lastChange = 0;
        let lastHandlerComplete = true;
        return async (eventType, filename) => {
            // if (eventType !== 'change' || !this.fileMap.has(filename)) return;
            if (eventType !== 'change') return;
            if (filename.startsWith('~')) return;
            if (!isInclude && !/\.xlsx$/.test(filename)) return;
            try {
                if (fs.lstatSync(path.join(dir, filename)).isDirectory()) return;
            } catch (error) {
                return;
            }

            const now = Date.now();
            if ((now - lastChange) > this.#trottleLimit && lastHandlerComplete) {
                lastHandlerComplete = false;
                lastChange = now;
                this.#reportChange(now, filename);
                await this.#handleChange(dir, filename, isInclude);
                lastHandlerComplete = true;
            }
        };
    }

    #reportChange(now, filename) {
        this.#logger.log();
        const nowFormatted = (new Date(now)).toISOString().substr(0, 19).replace('T', ' ');
        this.#logger.log(chalk.blueBright(`[${nowFormatted}]`), chalk.grey('Change detected:'), `${filename}`);
    }

    async #handleChange(dir, filename, isInclude) {
        const filepath = path.join(dir, filename);
        if (isInclude) {
            this.#includeFileManager.includeOneFile(filepath);
        } else {
            this.#excelFileManager.processOneFile(filepath);
        }
        // const added = await this.fileProcessor.processFile(filepath);
        // for (let i of added) this.dstCache.add(i);
        // if (this.zipPath) {
        //     const archSize = await zipFiles(this.destDir, [...this.dstCache], this.zipPath);
        //     this.#logger.log(chalk.green('  [>>]'), `Archiving complete. File size = ${archSize} bytes`);
        // }
    }

    /**
     * UTILS
     */

    #printStartBanner() {
        this.#logger.log();
        this.#logger.log(chalk.yellowBright('Watching source dirs...'));
        for (const d of this.#watchedDirs) this.#logger.log(chalk.grey`  ${d}`);
        if (process.stdout.isTTY) {
            this.#logger.log('To exit - press q, ctrl-d or ctrl-c');
        }
        else {
            this.#logger.log('To exit - press ctrl-c');
        }
        this.#logger.log();
    }

    #connectStdin() {
        if (!process.stdout.isTTY) return;
        process.stdin.resume();
        process.stdin.setRawMode(true);
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', (chunk) => {
            if (['q', '\u0003', '\u0004'].includes(chunk)) {
                this.#logger.log('Exiting...');
                this.close();
                process.exit(0);
            }
        });
    }
}

module.exports = Watcher;
