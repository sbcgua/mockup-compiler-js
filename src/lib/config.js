import fs from 'node:fs';
import path from 'node:path';

const CONFIG_DEFAULT_PATH = './.mock-config.json';

function assignDefaults(config) {
    if (!config.sourceDir) config.sourceDir = '.';
    if (!config.destDir) config.destDir = './_mock_build_temp';
    if (!config.eol || !['crlf','lf'].includes(config.eol) ) config.eol = 'lf';
}

function readConfigFile(confPath) {
    confPath = path.resolve(confPath);
    let config = fs.readFileSync(confPath, 'utf8');
    config = JSON.parse(config);
    config.rootDir = path.dirname(confPath);
    return config;
}

function postProcessConfig(config) {
    const rootDir = config.rootDir;
    const absolutize = p => path.isAbsolute(p) ? p : path.join(rootDir, p);
    const absolutizeParam = dir => { if (config[dir]) config[dir] = absolutize(config[dir]); };

    absolutizeParam('sourceDir');
    absolutizeParam('destDir');
    absolutizeParam('zipPath');

    if (config.includes) {
        config.includes = config.includes.map(absolutize);
    }
}

export function validateConfig(config) {
    if (!config.sourceDir) throw Error('Config or params must have sourceDir');
    if (!config.destDir) throw Error('Config or params must have destDir');
    // TODO validate complete shape
}

export function readConfig(confPath, overloads = null) {
    let config;
    if (confPath) {
        try {
            config = readConfigFile(confPath);
            config.rootDir = path.dirname(confPath);
        } catch {
            throw Error(`Could not read the config file: ${confPath}`);
        }
    } else {
        try {
            config = readConfigFile(CONFIG_DEFAULT_PATH);
            config.rootDir = path.dirname(CONFIG_DEFAULT_PATH);
        } catch {
            config = { rootDir: process.cwd() };
        }
    }
    config = { ...config, ...overloads };
    assignDefaults(config);
    postProcessConfig(config);
    validateConfig(config);
    return config;
}
