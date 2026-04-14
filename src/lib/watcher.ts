import fs, { type FSWatcher } from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import { slash, findCommonPath } from './utils/fs-utils.ts';
import { collectOutputFileList } from './utils/output-file-list.ts';
import type { BundlerContract, FileManagerContract, LoggerContract, MetaCalculatorContract } from './types';

type WatcherParams = {
    logger: LoggerContract;
    excelFileManager: FileManagerContract;
    includeFileManager?: FileManagerContract;
    bundler?: BundlerContract;
    metaCalculator?: MetaCalculatorContract;
    verbose?: boolean;
};

export default class Watcher {
    #logger: LoggerContract;
    #excelFileManager: FileManagerContract;
    #includeFileManager?: FileManagerContract;
    #throttleLimit: number;
    #watchers: FSWatcher[] = [];
    #watchedDirs: string[] = [];
    #bundler?: BundlerContract;
    #metaCalculator?: MetaCalculatorContract;
    #verbose: boolean;

    constructor({ logger, excelFileManager, includeFileManager, bundler, metaCalculator, verbose = false }: WatcherParams) {
        this.#logger = logger;
        this.#verbose = verbose;
        this.#excelFileManager = excelFileManager;
        this.#includeFileManager = includeFileManager;
        this.#metaCalculator = metaCalculator;
        this.#bundler = bundler;
        this.#throttleLimit = 1000;
    }

    start(): void {
        this.#initWatchers();
        this.#connectStdin();
        this.#printStartBanner();
    }

    close(): void {
        for (const watcher of this.#watchers) watcher.close();
    }

    #initWatchers(): void {
        const mockDir = this.#excelFileManager.srcDirs?.[0];
        if (!mockDir) throw new Error('Excel source dir is not configured');
        this.#watchers.push(fs.watch(mockDir, this.#createEventHandler(mockDir, this.#excelFileManager)));
        this.#watchedDirs.push(mockDir);

        if (this.#includeFileManager?.srcDirs) {
            for (const dir of this.#includeFileManager.srcDirs) {
                this.#watchers.push(fs.watch(dir, this.#createEventHandler(dir, this.#includeFileManager)));
                this.#watchedDirs.push(dir);
            }
        }
    }

    #createEventHandler(dir: string, fileManager: FileManagerContract): (eventType: string, filename: string | null) => void {
        let lastChange = 0;
        let lastHandlerComplete = true;
        const isFileRelevant = fileManager.isFileRelevant
            ? (filePath: string) => fileManager.isFileRelevant?.(filePath) ?? true
            : () => true;

        return (eventType, filename) => {
            const normalizedFilename = filename ?? '';
            if (eventType !== 'change') return;
            if (!isFileRelevant(normalizedFilename)) return;

            void (async () => {
                try {
                    if (fs.lstatSync(path.join(dir, normalizedFilename)).isDirectory()) return;
                } catch {
                    return;
                }

                const now = Date.now();
                if ((now - lastChange) > this.#throttleLimit && lastHandlerComplete) {
                    lastHandlerComplete = false;
                    lastChange = now;
                    this.#reportChange(now, normalizedFilename);
                    await this.#handleChange(dir, normalizedFilename, fileManager);
                    lastHandlerComplete = true;
                }
            })();
        };
    }

    #reportChange(now: number, filename: string): void {
        this.#logger.log();
        const nowFormatted = new Date(now).toLocaleString(undefined, {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
        }).replace(',', '');
        this.#logger.log(chalk.blueBright(`[${nowFormatted}]`), chalk.grey('Change detected:'), `${filename}`);
    }

    async #handleChange(dir: string, filename: string, fileManager: FileManagerContract): Promise<void> {
        const filepath = path.join(dir, filename);
        await fileManager.processOneFile(filepath);
        if (this.#metaCalculator) {
            await this.#metaCalculator.buildAndSave();
        }
        if (this.#bundler) {
            const archSize = await this.#bundler.bundle(collectOutputFileList({
                excelFileManager: this.#excelFileManager,
                includeFileManager: this.#includeFileManager,
                metaCalculator: this.#metaCalculator,
            }));
            this.#logger.log(chalk.green('  [>>]'), `Archiving complete. File size = ${archSize} bytes`);

            if (this.#verbose) {
                const mem = process.memoryUsage();
                this.#logger.log(
                    chalk.magenta('  [MEM]'),
                    `rss=${(mem.rss / 1024 / 1024).toFixed(1)}MB`,
                    `heapUsed=${(mem.heapUsed / 1024 / 1024).toFixed(1)}MB`,
                    `heapTotal=${(mem.heapTotal / 1024 / 1024).toFixed(1)}MB`
                );
            }
        }
    }

    #printStartBanner(): void {
        this.#logger.log();
        this.#logger.log(chalk.yellowBright(`Watching source dirs (${this.#watchedDirs.length}) ...`));

        const normalizedDirList = this.#watchedDirs.map(slash);
        const commonPath = findCommonPath(normalizedDirList);

        if (normalizedDirList.length > 1 && commonPath) {
            this.#logger.log(chalk.grey(`  ${commonPath}:`));
            for (const dir of normalizedDirList) {
                this.#logger.log(chalk.grey(`   ${dir.replace(commonPath, '') || '.'}`));
            }
        } else {
            for (const dir of normalizedDirList) this.#logger.log(chalk.grey(`  ${dir}`));
        }

        if (process.stdout.isTTY) {
            this.#logger.log('To exit - press q, ctrl-d or ctrl-c');
        } else {
            this.#logger.log('To exit - press ctrl-c');
        }
        this.#logger.log();
    }

    #connectStdin(): void {
        if (!process.stdout.isTTY) return;
        process.stdin.resume();
        process.stdin.setRawMode(true);
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', (chunk: string) => {
            if (['q', '\u0003', '\u0004'].includes(chunk)) {
                this.#logger.log('Exiting...');
                this.close();
                process.exit(0);
            }
        });
    }
}
