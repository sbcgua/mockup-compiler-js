#!/usr/bin/env node

const path = require('path');
const packageJson = require(path.resolve(__dirname, 'package.json'));
const chalk = require('chalk');
const { Command } = require('commander');

const App = require('./lib/app');
const { readConfig } = require('./lib/config');
const Logger = require('./lib/utils/logger');
const { argOptions, argsToConfig } = require('./lib/args');

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
