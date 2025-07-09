import fs from 'node:fs';
import path from 'node:path';

const CONFIG_DEFAULT_PATH = './.mock-config.json';

function assignDefaults(config) {
    if (!config.pattern) config.pattern = ['*.xlsx'];
    if (!config.eol) config.eol = 'lf';
    if (!config.bundleFormat) config.bundleFormat = 'zip';
    if (config.zipPath && !config.bundlePath) {
        config.bundlePath = config.zipPath;
        delete config.zipPath;
    }
}

function readConfigFile(confPath, {optional = false} = {}) {
    try {
        confPath = path.resolve(confPath);
        const configData = fs.readFileSync(confPath, 'utf8');
        const config = JSON.parse(configData);
        return config;
    } catch {
        if (!optional) throw Error(`Could not read the config file: ${confPath}`);
    }
}

function postProcessConfig(config, rootDir) {
    const absolutize = p => path.isAbsolute(p) ? p : path.join(rootDir, p);
    const absolutizePath = dir => { if (config[dir]) config[dir] = absolutize(config[dir]); };

    absolutizePath('sourceDir');
    absolutizePath('destDir');
    absolutizePath('bundlePath');

    if (config.includes) {
        config.includes = config.includes.map(absolutize);
    }
    if (config.eol) {
        config.eol = config.eol.toLowerCase();
    }
    if (config.pattern && !Array.isArray(config.pattern)) {
        config.pattern = [config.pattern];
    }
}

const CHECKS = {
    String: v => typeof v === 'string',
    Boolean: v => typeof v === 'boolean',
    Array: v => Array.isArray(v),
    ArrayOfStrings: v => Array.isArray(v) && (!v.length || v.every(x => typeof x === 'string')),
    eol: v => ['lf', 'crlf'].includes(v),
    bundleFormat: v => ['text', 'zip', 'text+zip'].includes(v),
};
const configScheme = {
    properties: {
        sourceDir:           { check: 'String' },
        destDir:             { check: 'String' },
        includes:            { check: 'ArrayOfStrings' },
        // zipPath:             { check: 'String' },
        bundlePath:          { check: 'String' },
        noBundle:            { check: 'Boolean' },
        inMemory:            { check: 'Boolean' },
        eol:                 { check: 'eol', mustBe: '"lf" or "crlf"' },
        bundleFormat:        { check: 'bundleFormat', mustBe: '"text" or "zip" or "text+zip"' },
        quiet:               { check: 'Boolean' },
        verbose:             { check: 'Boolean' },
        withMeta:            { check: 'Boolean' },
        cleanDestDirOnStart: { check: 'Boolean' },
        skipFieldsStartingWith: { check: 'String' },
        pattern:             { check: 'ArrayOfStrings' },
    },
    required: ['sourceDir', 'eol'],
};

export function validateConfig(config) {
    // Validate DestDir/inMemory
    if (!config.destDir && !config.inMemory) throw Error('Config or params must have "destDir" or enabled "inMemory"');
    if (config.destDir && config.inMemory) throw Error('"destDir" and "inMemory" cannot be used together. Please use only one of them.');
    if (config.inMemory && !config.bundlePath) {
        throw Error('"inMemory" mode requires "bundlePath" to be set');
    }
    // Validate required params
    for (let req of configScheme.required) {
        if (!config[req]) throw Error(`Config or params must have ${req}`);
    }
    // Validate complete shape
    for (let [key, val] of Object.entries(config)) {
        if (key.startsWith('#')) continue; // skip comments (it's more for internal use)
        const rule = configScheme.properties[key];
        if (!rule) throw Error(`Config validation error: unexpected param "${key}"`);
        if (!rule.check || !CHECKS[rule.check]) throw Error(`Unexpected validation rule: ${key}`); // Really unexpected :)
        let check = CHECKS[rule.check];
        if (!check(val)) {
            throw Error(`Config validation error: ${key} must be ${rule.mustBe || rule.check} (received: ${val})`);
        }
    }

}

export function readConfig(confPath, overloads = null) {
    let config;
    if (confPath) {
        config = readConfigFile(confPath); // readConfigFile throws if the file is not found
    } else {
        confPath = CONFIG_DEFAULT_PATH;
        config = readConfigFile(confPath, { optional: true }); // don't throw if the default config is not found
    }
    const rootDir = path.dirname(confPath);

    config = { ...config, ...overloads };
    assignDefaults(config);
    postProcessConfig(config, rootDir);
    validateConfig(config);
    return config;
}
