import fs from 'node:fs';
import path from 'node:path';

const CONFIG_DEFAULT_PATH = './.mock-config.json';

function assignDefaults(config) {
    if (!config.eol) config.eol = 'lf';
    if (!config.bundleFormat) config.bundleFormat = 'zip';
    if (config.zipPath && !config.bundlePath) {
        config.bundlePath = config.zipPath;
        delete config.zipPath;
    }
}

function readConfigFile(confPath, optional = false) {
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
}

const CHECKS = {
    String: v => typeof v === 'string',
    Boolean: v => typeof v === 'boolean',
    Array: v => Array.isArray(v),
    ArrayOfStrings: v => Array.isArray(v) && (!v.length || v.every(x => typeof x === 'string')),
    eol: v => ['lf', 'crlf'].includes(v),
    bundleFormat: v => ['text', 'zip'].includes(v), // 'text+zip'
};
const configScheme = {
    properties: {
        sourceDir:           { check: 'String' },
        destDir:             { check: 'String' },
        includes:            { check: 'ArrayOfStrings' },
        // zipPath:             { check: 'String' },
        bundlePath:          { check: 'String' },
        noBundle:            { check: 'Boolean' },
        eol:                 { check: 'eol', mustBe: '"lf" or "crlf"' },
        bundleFormat:        { check: 'bundleFormat', mustBe: '"text" or "zip"' }, // "text+zip"
        quiet:               { check: 'Boolean' },
        withMeta:            { check: 'Boolean' },
        cleanDestDirOnStart: { check: 'Boolean' },
        skipFieldsStartingWith: { check: 'String' },
    },
    required: ['sourceDir', 'destDir', 'eol'],
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
    if (!confPath) confPath = CONFIG_DEFAULT_PATH;
    const rootDir = path.dirname(confPath);

    let config = readConfigFile(confPath, Boolean(overloads));
    config = { ...config, ...overloads };
    assignDefaults(config);
    postProcessConfig(config, rootDir);
    validateConfig(config);
    return config;
}
