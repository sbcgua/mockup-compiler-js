import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import { slash, findCommonPath } from './utils/fs-utils.js';

export default class Watcher {
    #logger;
    #excelFileManager;
    #includeFileManager;
    #trottleLimit;
    #watchers = [];
    #watchedDirs = [];
    #bundler;
    #metaCalculator;

    constructor({ logger, excelFileManager, includeFileManager, bundler, metaCalculator }) {
        this.#logger = logger;
        this.#excelFileManager = excelFileManager;
        this.#includeFileManager = includeFileManager;
        this.#metaCalculator = metaCalculator;
        this.#bundler = bundler;
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
        const mockDir = this.#excelFileManager.srcDirs[0]; // Always one dir for excel
        this.#watchers.push(fs.watch(mockDir, this.#createEventHandler(mockDir, this.#excelFileManager, /\.xlsx$/)));
        this.#watchedDirs.push(mockDir);

        if (this.#includeFileManager) {
            for (const dir of this.#includeFileManager.srcDirs) {
                this.#watchers.push(fs.watch(dir, this.#createEventHandler(dir, this.#includeFileManager)));
                this.#watchedDirs.push(dir);
            }
        }
    }

    #createEventHandler(dir, fileManager, filenameRe = null) {
        let lastChange = 0;
        let lastHandlerComplete = true;
        return async (eventType, filename) => {
            if (eventType !== 'change') return;
            if (filename.startsWith('~')) return;
            if (filenameRe && !filenameRe.test(filename)) return;
            try {
                if (fs.lstatSync(path.join(dir, filename)).isDirectory()) return;
            } catch {
                // Excel saves create locked temp files, so ignore failed stats
                return;
            }

            const now = Date.now();
            if ((now - lastChange) > this.#trottleLimit && lastHandlerComplete) {
                lastHandlerComplete = false;
                lastChange = now;
                this.#reportChange(now, filename);
                await this.#handleChange(dir, filename, fileManager);
                lastHandlerComplete = true;
            }
        };
    }

    #reportChange(now, filename) {
        this.#logger.log();
        const nowFormatted = (new Date(now)).toISOString().substring(0, 19).replace('T', ' ');
        this.#logger.log(chalk.blueBright(`[${nowFormatted}]`), chalk.grey('Change detected:'), `${filename}`);
    }

    async #handleChange(dir, filename, fileManager) {
        const filepath = path.join(dir, filename);
        await fileManager.processOneFile(filepath);
        if (this.#metaCalculator) {
            this.#metaCalculator.buildAndSave();
        }
        if (this.#bundler) {
            const archSize = await this.#bundler.bundle([
                ...this.#excelFileManager.testObjectList,
                ...(this.#includeFileManager ? this.#includeFileManager.testObjectList : []),
                ...(this.#metaCalculator ? [this.#metaCalculator.metaSrcFileName] : []),
            ]);
            this.#logger.log(chalk.green('  [>>]'), `Archiving complete. File size = ${archSize} bytes`);
        }
    }

    /**
     * UTILS
     */

    #printStartBanner() {
        this.#logger.log();
        this.#logger.log(chalk.yellowBright(`Watching source dirs (${this.#watchedDirs.length}) ...`));

        const normilizedDirList = this.#watchedDirs.map(slash);
        const commonPath = findCommonPath(normilizedDirList);

        if (normilizedDirList.length > 1 && commonPath) {
            this.#logger.log(chalk.grey(`  ${commonPath}:`));
            for (const d of normilizedDirList)
                this.#logger.log(chalk.grey(`   ${d.replace(commonPath, '') || '.'}`));
        } else {
            for (const d of normilizedDirList) this.#logger.log(chalk.grey(`  ${d}`));
        }

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
