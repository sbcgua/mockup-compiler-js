import fs from 'node:fs';
import path from 'node:path';

const CONFIG_DEFAULT_PATH = './.mock-config.json';

function assignDefaults(config) {
    if (!config.sourceDir) config.sourceDir = '.';
    if (!config.destDir) config.destDir = './_mock_build_temp';
    if (!config.eol || !['crlf','lf'].includes(config.eol)) config.eol = 'lf';
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

const CHECKS = {
    String: v => typeof v === 'string',
    Boolean: v => typeof v === 'boolean',
    Array: v => Array.isArray(v),
    ArrayOfStrings: v => Array.isArray(v) && (!v.length || v.every(x => typeof x === 'string')),
    eol: v => v === 'lf' || v === 'crlf',
};
const configScheme = {
    properties: {
        rootDir:             { check: 'String' },
        sourceDir:           { check: 'String' },
        destDir:             { check: 'String' },
        zipPath:             { check: 'String' },
        suppressZip:         { check: 'Boolean' },
        includes:            { check: 'ArrayOfStrings' },
        eol:                 { check: 'eol', mustBe: '"lf" or "crlf"' },
        quiet:               { check: 'Boolean' },
        withMeta:            { check: 'Boolean' },
        cleanDestDirOnStart: { check: 'Boolean' },
    },
    required: ['rootDir', 'sourceDir', 'destDir'],
};

export function validateConfig(config) {
    // Validate required params
    for (let req of configScheme.required) {
        if (!config[req]) throw Error(`Config or params must have ${req}`);
    }
    // Validate complete shape
    for (let [key, val] of Object.entries(config)) {
        const rule = configScheme.properties[key];
        if (!rule) throw Error(`Config validation error: unexpected param ${key}`);
        if (!rule.check || !CHECKS[rule.check]) throw Error(`Unexpected validation rule: ${key}`); // Really unexpected :)
        let check = CHECKS[rule.check];
        if (!check(val)) {
            throw Error(`Config validation error: ${key} must be ${rule.mustBe || rule.check}`);
        }
    }

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
