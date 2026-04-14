#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Command } from 'commander';
import chalk from 'chalk';

import App from './lib/app.ts';
import { argOptions, argsToConfig } from './lib/args.ts';
import { readConfig } from './lib/config.ts';
import type { AppRuntimeConfig, CliArgs } from './lib/types';
import Logger from './lib/utils/logger.ts';

type AppError = Error & {
    _file?: string;
    _sheet?: string;
    _loc?: string;
};

type SeaModule = {
    getAsset(key: string, encoding: string): string;
    isSea(): boolean;
};

function loadSeaModule(): SeaModule | null {
    try {
        const require = createRequire(import.meta.url);
        return require('node:sea') as SeaModule;
    } catch {
        return null;
    }
}

function readVersion(): string {
    try {
        let packageBlob: string | Buffer;
        const sea = loadSeaModule();
        if (sea?.isSea()) {
            packageBlob = sea.getAsset('package.json', 'utf-8');
        } else {
            const indexFileDir = path.dirname(fileURLToPath(import.meta.url));
            try {
                packageBlob = readFileSync(path.join(indexFileDir, './package.json'));
            } catch {
                packageBlob = readFileSync(path.join(indexFileDir, '../package.json'));
            }
        }

        const packageInfo = JSON.parse(packageBlob.toString()) as { name?: string; version?: string };
        if (packageInfo.name !== 'mockup-compiler-js' || typeof packageInfo.version !== 'string') {
            throw new Error('Invalid package.json');
        }
        return packageInfo.version;
    } catch {
        console.error(chalk.redBright('Cannot read package info (version)'));
        process.exit(1);
    }
}

async function main(args: CliArgs): Promise<void> {
    if (!args.color) chalk.level = 0;

    try {
        const overloadsFromArgs = argsToConfig(args);
        const config = readConfig(args.config, overloadsFromArgs);
        const runtimeConfig: AppRuntimeConfig = {
            ...config,
            logger: new Logger({ quiet: config.quiet }),
        };
        const app = new App(runtimeConfig, Boolean(args.watch));
        await app.run();
    } catch (error) {
        const appError = error as AppError;
        console.error(chalk.redBright(appError.message));
        if (appError._file) console.error(`  @file: ${appError._file}`);
        if (appError._sheet) console.error(`  @sheet: ${appError._sheet}`);
        if (appError._loc) console.error(`  @loc: ${appError._loc}`);
        if (args.verbose) console.error(appError.stack);
        process.exit(1);
    }
}

const commander = new Command();
for (const [flags, description] of argOptions) {
    commander.option(flags, description);
}
commander.version(readVersion());

process.on('unhandledRejection', (reason) => {
    if (!commander.opts().quiet) {
        console.error('[CRASH] unhandledRejection:', reason);
    }
    process.exit(1);
});

commander.parse(process.argv);
void main(commander.opts<CliArgs>());
