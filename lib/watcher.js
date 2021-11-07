const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const {slash} = require('./utils/fs-utils');

class Watcher {
    #logger;
    #excelFileManager;
    #includeFileManager;
    #trottleLimit;
    #watchers = [];
    #watchedDirs = [];
    #zipper;
    #metaCalculator;

    constructor({ logger, excelFileManager, includeFileManager, zipper, metaCalculator }) {
        this.#logger = logger;
        this.#excelFileManager = excelFileManager;
        this.#includeFileManager = includeFileManager;
        this.#metaCalculator = metaCalculator;
        this.#zipper = zipper;
        this.#trottleLimit = 1000;
    }

    start() {
        this.#initWatchers();
        this.#connectStdin();
        this.#printStartBanner();
    }

    close() {
        for (const w of this.#watchers) w.close();
    }

    #initWatchers() {
        const mockDir = this.#excelFileManager.srcDir;
        this.#watchers.push(fs.watch(mockDir, this.#createEventHandler(mockDir, { isExcel: true })));
        this.#watchedDirs.push(mockDir);

        if (this.#includeFileManager) {
            for (const iDir of this.#includeFileManager.includeDirs) {
                this.#watchers.push(fs.watch(iDir, this.#createEventHandler(iDir, { isExcel: false })));
                this.#watchedDirs.push(iDir);
            }
        }
    }

    #createEventHandler(dir, {isExcel}) {
        let lastChange = 0;
        let lastHandlerComplete = true;
        return async (eventType, filename) => {
            if (eventType !== 'change') return;
            if (filename.startsWith('~')) return;
            if (isExcel && !/\.xlsx$/.test(filename)) return;
            try {
                if (fs.lstatSync(path.join(dir, filename)).isDirectory()) return;
            } catch (error) {
                // Excel saves create locked temp files, so ignore failed stats
                return;
            }

            const now = Date.now();
            if ((now - lastChange) > this.#trottleLimit && lastHandlerComplete) {
                lastHandlerComplete = false;
                lastChange = now;
                this.#reportChange(now, filename);
                await this.#handleChange(dir, filename, isExcel);
                lastHandlerComplete = true;
            }
        };
    }

    #reportChange(now, filename) {
        this.#logger.log();
        const nowFormatted = (new Date(now)).toISOString().substr(0, 19).replace('T', ' ');
        this.#logger.log(chalk.blueBright(`[${nowFormatted}]`), chalk.grey('Change detected:'), `${filename}`);
    }

    async #handleChange(dir, filename, isExcel) {
        const filepath = path.join(dir, filename);
        if (isExcel) {
            await this.#excelFileManager.processOneFile(filepath);
        } else {
            await this.#includeFileManager.includeOneFile(filepath);
        }
        if (this.#metaCalculator) {
            this.#metaCalculator.buildAndSave();
        }
        if (this.#zipper) {
            const archSize = await this.#zipper.zipAsync([
                ...this.#excelFileManager.mockList,
                ...(this.#includeFileManager ? this.#includeFileManager.copiedFileList : []),
                ...(this.#metaCalculator ? [this.#metaCalculator.metaSrcFileName] : []),
            ]);
            this.#logger.log(chalk.green('  [>>]'), `Archiving complete. File size = ${archSize} bytes`);
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
        for (const d of this.#watchedDirs) this.#logger.log(chalk.grey`  ${slash(d)}`);
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
