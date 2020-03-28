const fs = require('fs');
const path = require('path');

function assignDefaults(config) {
    if (!config.sourceDir) config.sourceDir = '.';
    if (!config.destDir) config.destDir = './_mock_build_temp';
    if (!config.eol || !['crlf','lf'].includes(config.eol) ) config.eol = 'crlf';
}

function readConfigFile(confPath) {
    confPath = path.resolve(confPath);
    let config = fs.readFileSync(confPath, 'utf8');
    config = JSON.parse(config);
    config.rootDir = path.dirname(confPath);
    return config;
}

function postprocessConfig(config) {
    const rootDir = config.rootDir;
    if (config.sourceDir && !path.isAbsolute(config.sourceDir)) {
        config.sourceDir = path.join(rootDir, config.sourceDir);
    }
    if (config.destDir && !path.isAbsolute(config.destDir)) {
        config.destDir = path.join(rootDir, config.destDir);
    }
    if (config.zipPath && !path.isAbsolute(config.zipPath)) {
        config.zipPath = path.join(rootDir, config.zipPath);
    }
    if (config.includes) {
        config.includes = config.includes.map(i => path.isAbsolute(i) ? i : path.join(rootDir, i));
    }
}

function validateConfig(config) {
    if (!config.sourceDir) throw Error('Config must have sourceDir');
}

function readConfig(confPath, overloads = null) {
    const config = { ...readConfigFile(confPath), ...overloads };
    assignDefaults(config);
    postprocessConfig(config);
    validateConfig(config);
    return config;
}

module.exports = {
    readConfig,
    validateConfig,
};
