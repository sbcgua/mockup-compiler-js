import fs from 'node:fs';
import path from 'node:path';
import type { AppConfig, ConfigOverloads, RawConfig } from '../types/index';

const CONFIG_DEFAULT_PATH = './.mock-config.json';

type ConfigCheckName = 'String' | 'Boolean' | 'Array' | 'ArrayOfStrings' | 'eol' | 'bundleFormat';
type ConfigPropertyName = keyof Omit<RawConfig, `#${string}` | 'zipPath' | 'logger'>;
type ConfigRule = { check: ConfigCheckName; mustBe?: string };

function assignDefaults(config: RawConfig): void {
    if (!config.pattern) config.pattern = ['*.xlsx'];
    if (!config.eol) config.eol = 'lf';
    if (!config.bundleFormat) config.bundleFormat = 'zip';
    if (config.zipPath && !config.bundlePath) {
        config.bundlePath = config.zipPath;
        delete config.zipPath;
    }
}

function readConfigFile(confPath: string, { optional = false }: { optional?: boolean } = {}): RawConfig | undefined {
    try {
        confPath = path.resolve(confPath);
        const configData = fs.readFileSync(confPath, 'utf8');
        return JSON.parse(configData) as RawConfig;
    } catch {
        if (!optional) throw Error(`Could not read the config file: ${confPath}`);
    }
}

function postProcessConfig(config: RawConfig, rootDir: string): void {
    const absolutize = (p: string): string => path.isAbsolute(p) ? p : path.join(rootDir, p);
    const absolutizePath = (dir: 'sourceDir' | 'destDir' | 'bundlePath'): void => {
        const value = config[dir];
        if (value) config[dir] = absolutize(value);
    };

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

const CHECKS: Record<ConfigCheckName, (value: unknown) => boolean> = {
    String: value => typeof value === 'string',
    Boolean: value => typeof value === 'boolean',
    Array: value => Array.isArray(value),
    ArrayOfStrings: value => Array.isArray(value) && (!value.length || value.every(item => typeof item === 'string')),
    eol: value => typeof value === 'string' && ['lf', 'crlf'].includes(value),
    bundleFormat: value => typeof value === 'string' && ['text', 'zip', 'text+zip'].includes(value),
};

const configScheme: { properties: Record<ConfigPropertyName, ConfigRule>; required: ConfigPropertyName[] } = {
    properties: {
        sourceDir: { check: 'String' },
        destDir: { check: 'String' },
        includes: { check: 'ArrayOfStrings' },
        bundlePath: { check: 'String' },
        noBundle: { check: 'Boolean' },
        inMemory: { check: 'Boolean' },
        eol: { check: 'eol', mustBe: '"lf" or "crlf"' },
        bundleFormat: { check: 'bundleFormat', mustBe: '"text" or "zip" or "text+zip"' },
        quiet: { check: 'Boolean' },
        verbose: { check: 'Boolean' },
        withMeta: { check: 'Boolean' },
        cleanDestDirOnStart: { check: 'Boolean' },
        skipFieldsStartingWith: { check: 'String' },
        pattern: { check: 'ArrayOfStrings' },
    },
    required: ['sourceDir', 'eol'],
};

export function validateConfig(config: RawConfig): asserts config is AppConfig {
    if (!config.destDir && !config.inMemory) throw Error('Config or params must have "destDir" or enabled "inMemory"');
    if (config.destDir && config.inMemory) throw Error('"destDir" and "inMemory" cannot be used together. Please use only one of them.');
    if (config.inMemory && !config.bundlePath) {
        throw Error('"inMemory" mode requires "bundlePath" to be set');
    }

    for (const req of configScheme.required) {
        if (!config[req]) throw Error(`Config or params must have ${req}`);
    }

    for (const [key, val] of Object.entries(config)) {
        if (key.startsWith('#')) continue;
        if (!(key in configScheme.properties)) {
            throw Error(`Config validation error: unexpected param "${key}"`);
        }

        const rule = configScheme.properties[key as ConfigPropertyName];
        const check = CHECKS[rule.check];
        if (!check(val)) {
            throw Error(`Config validation error: ${key} must be ${rule.mustBe || rule.check} (received: ${val})`);
        }
    }
}

export function readConfig(confPath?: string, overloads: ConfigOverloads | null = null): AppConfig {
    const loadedConfig = confPath
        ? readConfigFile(confPath)
        : readConfigFile(CONFIG_DEFAULT_PATH, { optional: true });
    const resolvedPath = confPath ?? CONFIG_DEFAULT_PATH;
    const rootDir = path.dirname(resolvedPath);

    const config: RawConfig = { ...(loadedConfig ?? {}), ...(overloads ?? {}) };
    assignDefaults(config);
    postProcessConfig(config, rootDir);
    validateConfig(config);
    return config;
}
