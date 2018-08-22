const App = require('./lib/app');
const { readConfig } = require('./lib/config');
const commander = require('./lib/patched-commander');
const chalk = require('chalk');

const CONFIG_DEFAULT_PATH = './.mock-config.json';

function argsToConfig(args) {
    const config = {
        sourceDir: args.source,
        destDir:   args.destination,
        zipPath:   args.zip,
        includes:  args.include && [args.include],
    };
    for (let k of Object.keys(config)) if (!config[k]) delete config[k];
    return config;
}

async function main(args) {
    const config = readConfig(args.config || CONFIG_DEFAULT_PATH, argsToConfig(args));
    if (!args.color) chalk.enabled = false;

    try {
        const app = new App(config, args.watch);
        await app.run();
    } catch (error) {
        console.error(chalk.redBright(error.message + (error._loc ? ` @${error._loc}` : '')));
        console.error(error.stack);
    }
}

[
    ['-b, --no-color', 'suppress colors'],
    ['-w, --watch', 'keep watching the files and re-render when changed'],
    ['-c, --config <path>', 'read config from this file'],
    ['-s, --source <path>', 'source directory'],
    ['-d, --destination <path>', 'destination uncompressed dir'],
    ['-z, --zip <path>', 'path to zip file to build'],
    ['-i, --include <path>', 'path to include'],
].forEach(opt => commander.option(...opt));
commander.parse(process.argv);

process.on('unhandledRejection', (reason) => {
    console.log('CRASH! unhandledRejection:', reason);
    process.exit(1);
});
main(commander.collectAllOpts());
