import fs from 'node:fs';
import path from 'node:path';

const CONFIG_DEFAULT_PATH = './.mock-config.json';

function assignDefaults(config) {
    if (!config.sourceDir) config.sourceDir = '.';
    if (!config.destDir) config.destDir = './_mock_build_temp';
    if (!config.eol || !['crlf','lf'].includes(config.eol)) config.eol = 'lf';
}

function readConfigFile(confPath) {
    try {
        confPath = path.resolve(confPath);
        const configData = fs.readFileSync(confPath, 'utf8');
        const config = JSON.parse(configData);
        config.rootDir = path.dirname(confPath);
        return config;
    } catch {
        throw Error(`Could not read the config file: ${confPath}`);
    }
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
        includes:            { check: 'ArrayOfStrings' },
        destDir:             { check: 'String' },
        zipPath:             { check: 'String' },
        suppressZip:         { check: 'Boolean' },
        eol:                 { check: 'eol', mustBe: '"lf" or "crlf"' },
        quiet:               { check: 'Boolean' },
        withMeta:            { check: 'Boolean' },
        cleanDestDirOnStart: { check: 'Boolean' },
    },
    required: ['rootDir', 'sourceDir', 'destDir'],
};

// TODO: rootDir not needed?

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
    if (!confPath) confPath = CONFIG_DEFAULT_PATH;
    let config = readConfigFile(confPath);
    config = { ...config, ...overloads };
    assignDefaults(config);
    postProcessConfig(config);
    validateConfig(config);
    return config;
}
