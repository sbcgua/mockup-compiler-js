#!/usr/bin/env node

const App = require('./lib/app');
const { readConfig } = require('./lib/config');
const commander = require('commander');
const chalk = require('chalk');
const Logger = require('./lib/logger');

const CONFIG_DEFAULT_PATH = './.mock-config.json';

function argsToConfig(args) {
    if (args.eol && !/^(lf|crlf)$/i.test(args.eol)) {
        console.error('EOL must be "lf" or "crlf"');
        process.exit(1);
    }

    const config = {
        sourceDir: args.source,
        destDir:   args.destination,
        zipPath:   args.zip,
        includes:  args.include && [args.include],
        eol:       args.eol,
        quiet:     args.quiet,
    };
    for (let k of Object.keys(config)) {
        if (!config[k]) delete config[k];
    }
    return config;
}

async function main(args) {
    const config = readConfig(args.config || CONFIG_DEFAULT_PATH, argsToConfig(args));
    if (!args.color) chalk.enabled = false;
    config.logger = new Logger({quiet: config.quiet});

    try {
        const app = new App(config, args.watch);
        await app.run();
    } catch (error) {
        console.error(chalk.redBright(error.message));
        if (error._file) console.error(`  @file: ${error._file}`);
        if (error._sheet) console.error(`  @sheet: ${error._sheet}`);
        if (error._loc) console.error(`  @loc: ${error._loc}`);
        console.error(error.stack);
    }
}

[
    ['-b, --no-color', 'suppress colors'],
    ['-q, --quiet', 'show no output'],
    ['-w, --watch', 'keep watching the files and re-render when changed'],
    ['-c, --config <path>', 'read config from this file'],
    ['-s, --source <path>', 'source directory'],
    ['-d, --destination <path>', 'destination uncompressed dir'],
    ['-z, --zip <path>', 'path to zip file to build'],
    ['-i, --include <path>', 'path to include'],
    ['-e, --eol <eolchar>', 'end-of-line char: lf or crlf'],
].forEach(opt => commander.option(...opt));
commander.parse(process.argv);

process.on('unhandledRejection', (reason) => {
    if (!commander.quiet) console.error('CRASH! unhandledRejection:', reason);
    process.exit(1);
});
main(commander.opts());
