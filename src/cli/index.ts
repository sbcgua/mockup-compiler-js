#!/usr/bin/env bun

import { Command } from 'commander';
import chalk from 'chalk';

import App from '../app/app.ts';
import { argOptions, argsToConfig } from './args.ts';
import { readConfig } from './config.ts';
import type { AppRuntimeConfig, CliArgs } from '../types/index';
import { readPackageInfo } from './package-info.ts';
import Logger from '../common/logger.ts';
import { validateBundleFile } from '../bundle/validator.ts';

type AppError = Error & {
    _file?: string;
    _sheet?: string;
    _loc?: string;
};

async function readVersion(): Promise<string> {
    try {
        const packageInfo = await readPackageInfo();
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

function addCompileOptions(command: Command): void {
    for (const [flags, description] of argOptions) {
        command.option(flags, description);
    }
}

async function runValidate(file: string): Promise<void> {
    try {
        const warning = validateBundleFile(file);
        if (warning) {
            console.warn(`${chalk.yellowBright('WARNING')}: ${warning}`);
        }
        console.log('Validation successful. File is a valid mockup text bundle.');
    } catch (error) {
        const validationError = error as Error;
        console.error(chalk.redBright(validationError.message));
        process.exit(1);
    }
}

async function bootstrap(): Promise<void> {
    const commander = new Command();
    const compileCommand = new Command('compile')
        .description('Compile mockup bundle data (the default, runs even if unspecified)');
    const validateCommand = new Command('validate')
        .argument('<file>')
        .description('Validate text bundle file')
        .action(async (file: string) => {
            await runValidate(file);
        });
    let actualCommand: string | undefined;

    addCompileOptions(commander);
    commander.version(await readVersion());
    commander.hook('preAction', (_thisCommand, actionCommand) => {
        actualCommand = actionCommand.name();
    });
    commander.addCommand(validateCommand);
    commander.addCommand(compileCommand, { isDefault: true });

    process.on('unhandledRejection', (reason) => {
        if (!commander.opts().quiet) {
            console.error('[CRASH] unhandledRejection:', reason);
        }
        process.exit(1);
    });

    await commander.parseAsync(process.argv);

    if (actualCommand === 'compile') {
        await main(commander.opts<CliArgs>());
    }
}

void bootstrap();
