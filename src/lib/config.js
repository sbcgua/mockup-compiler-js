// @ts-check

import fs from 'node:fs';
import path from 'node:path';

const CONFIG_DEFAULT_PATH = './.mock-config.json';

/** @typedef {import('./types').RawConfig} RawConfig */
/** @typedef {import('./types').ConfigOverloads} ConfigOverloads */
/** @typedef {import('./types').AppConfig} AppConfig */
/**
 * @typedef {'String' | 'Boolean' | 'Array' | 'ArrayOfStrings' | 'eol' | 'bundleFormat'} ConfigCheckName
 */
/**
 * @typedef {keyof Omit<RawConfig, `#${string}` | 'zipPath' | 'logger'>} ConfigPropertyName
 */
/**
 * @typedef {{ check: ConfigCheckName, mustBe?: string }} ConfigRule
 */

/**
 * @param {RawConfig} config
 */
function assignDefaults(config) {
    if (!config.pattern) config.pattern = ['*.xlsx'];
    if (!config.eol) config.eol = 'lf';
    if (!config.bundleFormat) config.bundleFormat = 'zip';
    if (config.zipPath && !config.bundlePath) {
        config.bundlePath = config.zipPath;
        delete config.zipPath;
    }
}

/**
 * @param {string} confPath
 * @param {{ optional?: boolean }} [options]
 * @returns {RawConfig | undefined}
 */
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

/**
 * @param {RawConfig} config
 * @param {string} rootDir
 */
function postProcessConfig(config, rootDir) {
    /** @param {string} p */
    const absolutize = p => path.isAbsolute(p) ? p : path.join(rootDir, p);
    /** @param {'sourceDir' | 'destDir' | 'bundlePath'} dir */
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
    /** @param {unknown} v */
    String: v => typeof v === 'string',
    /** @param {unknown} v */
    Boolean: v => typeof v === 'boolean',
    /** @param {unknown} v */
    Array: v => Array.isArray(v),
    /** @param {unknown} v */
    ArrayOfStrings: v => Array.isArray(v) && (!v.length || v.every(x => typeof x === 'string')),
    /** @param {unknown} v */
    eol: v => typeof v === 'string' && ['lf', 'crlf'].includes(v),
    /** @param {unknown} v */
    bundleFormat: v => typeof v === 'string' && ['text', 'zip', 'text+zip'].includes(v),
};
/** @type {{ properties: Record<ConfigPropertyName, ConfigRule>, required: ConfigPropertyName[] }} */
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

/**
 * @param {RawConfig} config
 * @returns {asserts config is AppConfig}
 */
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
        const prop = /** @type {ConfigPropertyName | undefined} */ (key in configScheme.properties ? key : undefined);
        const rule = prop ? configScheme.properties[prop] : undefined;
        if (!rule) throw Error(`Config validation error: unexpected param "${key}"`);
        if (!rule.check || !CHECKS[rule.check]) throw Error(`Unexpected validation rule: ${key}`); // Really unexpected :)
        const check = CHECKS[rule.check];
        if (!check(val)) {
            throw Error(`Config validation error: ${key} must be ${rule.mustBe || rule.check} (received: ${val})`);
        }
    }

}

/**
 * @param {string | undefined} confPath
 * @param {ConfigOverloads | null} [overloads]
 * @returns {AppConfig}
 */
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
