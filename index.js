#!/usr/bin/env node

import packageJson from './package.json' assert { type: 'json' };
import chalk from 'chalk';
import { Command } from 'commander';

import App from './lib/app.js';
import { readConfig } from './lib/config.js';
import Logger from './lib/utils/logger.js';
import { argOptions, argsToConfig } from './lib/args.js';

async function main(args) {
    if (!args.color) chalk.level = 0;

    try {
        const overloadsFromArgs = argsToConfig(args);
        const config = readConfig(args.config, overloadsFromArgs);
        config.logger = new Logger({quiet: config.quiet});
        const app = new App(config, args.watch);
        await app.run();
    } catch (error) {
        console.error(chalk.redBright(error.message));
        if (error._file) console.error(`  @file: ${error._file}`);
        if (error._sheet) console.error(`  @sheet: ${error._sheet}`);
        if (error._loc) console.error(`  @loc: ${error._loc}`);
        if (args.verbose) console.error(error.stack);
        process.exit(1);
    }
}

process.on('unhandledRejection', (reason) => {
    if (!commander.opts().quiet) console.error('CRASH! unhandledRejection:', reason);
    process.exit(1);
});

const commander = new Command();
argOptions.forEach(opt => commander.option(...opt));
commander.version(packageJson.version);
commander.parse(process.argv);
main(commander.opts());
