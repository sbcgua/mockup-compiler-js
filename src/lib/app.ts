import fs from 'node:fs';
import chalk from 'chalk';
import { fs as memfs, vol as memVol } from 'memfs';

import Watcher from './watcher.ts';
import MetaCalculator from './proc/meta.ts';
import ExcelFileManager from './proc/file-manager-excel.ts';
import IncludeFileManager from './proc/file-manager-includes.ts';
import { createMockProcessor, parseWorkbookIntoMocks } from './proc/mock-processings.ts';
import { Bundler } from './utils/bundler.ts';
import { buildZipBundle, buildTextBundle, buildTextZipBundle } from './utils/bundler-functions.ts';
import type { AppRuntimeConfig, BundleFormat, BundlerFunction, ReadableFsLike, WritableFsLike } from './types';

type SetupExcelFileManagerParams = {
    eol: AppRuntimeConfig['eol'];
    skipFieldsStartingWith?: string;
    pattern: string[];
    srcDir: string;
    destDir: string;
};

type SetupIncludeFileManagerParams = {
    destDir: string;
    includes?: string[];
};

type SetupMetaCalculatorParams = {
    eol: AppRuntimeConfig['eol'];
    destDir: string;
};

type SetupBundlerParams = {
    noBundle?: boolean;
    bundleFormat: BundleFormat;
    destDir: string;
    bundlePath?: string;
};

export default class App {
    #logger: AppRuntimeConfig['logger'];
    #excelFileManager: ExcelFileManager;
    #includeFileManager?: IncludeFileManager;
    #metaCalculator?: MetaCalculator;
    #bundler?: Bundler;
    #watcher?: Watcher;
    #withMeta?: boolean;
    #inMemory = false;
    #verbose = false;

    #getMemoryWritableFs(): WritableFsLike {
        return memfs;
    }

    #getMemoryReadableFs(): ReadableFsLike {
        return memfs;
    }

    constructor(config: AppRuntimeConfig, withWatcher: boolean) {
        this.#logger = config.logger;
        this.#withMeta = config.withMeta;
        this.#inMemory = Boolean(config.inMemory);
        this.#verbose = Boolean(config.verbose);

        let destDir = config.destDir;
        if (this.#inMemory) {
            if (destDir) throw Error('"inMemory" mode cannot be used with "destDir"');
            destDir = '/';
        }
        if (!destDir) throw new Error('Destination dir is required');

        this.#initDestDir(destDir, { cleanDestDirOnStart: config.cleanDestDirOnStart });
        this.#excelFileManager = this.#setupExcelFileManager({
            srcDir: config.sourceDir,
            destDir,
            eol: config.eol,
            skipFieldsStartingWith: config.skipFieldsStartingWith,
            pattern: config.pattern,
        });
        this.#includeFileManager = this.#setupIncludeFileManager({
            destDir,
            includes: config.includes,
        });
        this.#metaCalculator = this.#setupMetaCalculator({
            eol: config.eol,
            destDir,
        });
        this.#bundler = this.#setupBundler({
            noBundle: config.noBundle,
            bundleFormat: config.bundleFormat,
            destDir,
            bundlePath: config.bundlePath,
        });
        this.#watcher = this.#setupWatcher({
            withWatcher,
            verbose: this.#verbose,
        });
    }

    #initDestDir(destDir: string, { cleanDestDirOnStart }: { cleanDestDirOnStart?: boolean }): void {
        if (this.#inMemory) {
            memVol.reset();
            return;
        }

        if (fs.existsSync(destDir)) {
            if (cleanDestDirOnStart) {
                this.#logger.log(chalk.grey('Removing dest dir'), destDir);
                fs.rmSync(destDir, { recursive: true, force: true });
                fs.mkdirSync(destDir);
            }
        } else {
            fs.mkdirSync(destDir);
        }
    }

    #setupExcelFileManager({ eol, skipFieldsStartingWith, pattern, srcDir, destDir }: SetupExcelFileManagerParams): ExcelFileManager {
        const fileProcessor = new ExcelFileManager({
            srcDir,
            destDir,
            mockExtractor: parseWorkbookIntoMocks,
            mockProcessor: createMockProcessor(eol, skipFieldsStartingWith),
            withHashing: this.#withMeta,
            pattern,
            memfs: this.#inMemory ? this.#getMemoryWritableFs() : undefined,
        });
        fileProcessor.on('start-of-file-processing', ({ name }) => {
            this.#logger.log(chalk.grey('Processing:'), `${name}`);
        });
        fileProcessor.on('item-processed', ({ name, rowCount }) => {
            this.#logger.log(chalk.green('  [OK]'), `${name} (${rowCount} rows)`);
        });
        return fileProcessor;
    }

    #setupIncludeFileManager({ destDir, includes }: SetupIncludeFileManagerParams): IncludeFileManager | undefined {
        if (!includes || includes.length === 0) return undefined;
        if (includes.length > 1) {
            throw Error('Multiple includes is not supported curently, please log an issue if you need this feature');
        }

        const includeManager = new IncludeFileManager({
            includeDir: includes[0],
            destDir,
            withHashing: this.#withMeta,
            memfs: this.#inMemory ? this.#getMemoryWritableFs() : undefined,
        });
        includeManager.on('item-processed', ({ name }) => {
            this.#logger.log(chalk.green('  [OK]'), `${name}`);
        });
        return includeManager;
    }

    #setupMetaCalculator({ eol, destDir }: SetupMetaCalculatorParams): MetaCalculator | undefined {
        if (!this.#withMeta) return undefined;
        return new MetaCalculator({
            excelFileManager: this.#excelFileManager,
            includeFileManager: this.#includeFileManager,
            destDir,
            eol,
            memfs: this.#inMemory ? this.#getMemoryWritableFs() : undefined,
        });
    }

    #chooseBundleFormat(bundleFormat: BundleFormat): BundlerFunction {
        switch (bundleFormat) {
            case 'text': return buildTextBundle;
            case 'text+zip': return buildTextZipBundle;
            case 'zip': return buildZipBundle;
            default: throw new Error(`Unsupported bundle format: ${bundleFormat}`);
        }
    }

    #setupBundler({ noBundle, bundleFormat, destDir, bundlePath }: SetupBundlerParams): Bundler | undefined {
        if (!bundlePath || bundlePath === '') return undefined;
        if (noBundle) return undefined;

        return new Bundler({
            sourceDir: destDir,
            memfs: this.#inMemory ? this.#getMemoryReadableFs() : undefined,
            bundlePath,
            bundleFn: this.#chooseBundleFormat(bundleFormat),
        });
    }

    #setupWatcher({ withWatcher, verbose }: { withWatcher: boolean; verbose: boolean }): Watcher | undefined {
        if (!withWatcher) return undefined;
        return new Watcher({
            logger: this.#logger,
            excelFileManager: this.#excelFileManager,
            includeFileManager: this.#includeFileManager,
            metaCalculator: this.#metaCalculator,
            bundler: this.#bundler,
            verbose,
        });
    }

    async run(): Promise<void> {
        await this.#processFiles();
        this.#printStats();

        if (this.#metaCalculator) {
            await this.#metaCalculator.buildAndSave();
        }

        if (this.#inMemory && this.#verbose) {
            this.#logger.log(chalk.blue('\nIn-memory file system tree:'));
            console.log(chalk.grey(memVol.toTree()));
            console.log();
        }

        if (this.#bundler) {
            await this.#createBundle();
        }

        if (this.#verbose) {
            const mem = process.memoryUsage();
            this.#logger.log(
                chalk.magenta('  [MEM]'),
                `rss=${(mem.rss / 1024 / 1024).toFixed(1)}MB`,
                `heapUsed=${(mem.heapUsed / 1024 / 1024).toFixed(1)}MB`,
                `heapTotal=${(mem.heapTotal / 1024 / 1024).toFixed(1)}MB`
            );
        }

        if (this.#watcher) {
            this.#watcher.start();
        }
    }

    async #processFiles(): Promise<void> {
        await this.#excelFileManager.processAll();
        if (this.#includeFileManager) {
            this.#logger.log(chalk.grey('\nProcessing:'), 'Includes');
            await this.#includeFileManager.processAll();
        }
    }

    async #createBundle(): Promise<void> {
        const completeFileList = [
            ...this.#excelFileManager.testObjectList,
            ...(this.#includeFileManager?.testObjectList ?? []),
            ...(this.#metaCalculator ? [this.#metaCalculator.metaSrcFileName] : []),
        ];
        const archSize = await this.#bundler!.bundle(completeFileList);
        this.#logger.log(`\nBundle ready. File size = ${archSize} bytes`);
        this.#logger.log(this.#bundler!.bundlePath);
    }

    #printStats(): void {
        this.#logger.log();
        this.#logger.log('-----------------------');
        this.#logger.log(chalk.grey('Processed files: '), `${this.#excelFileManager.fileHashMap.size}`);
        this.#logger.log(chalk.grey('Processed sheets:'), `${this.#excelFileManager.testObjectList.length}`);
        if (this.#includeFileManager) {
            this.#logger.log(chalk.grey('Added assets:    '), `${this.#includeFileManager.fileHashMap.size}`);
        }
    }
}
