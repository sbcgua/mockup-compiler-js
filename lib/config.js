const fs = require('fs');
const path = require('path');

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

function validateConfig(config) {
    if (!config.sourceDir) throw Error('Config must have sourceDir');
    if (!config.destDir) throw Error('Config must have destDir');
}

function readConfig(confPath, overloads = null) {
    const config = { ...readConfigFile(confPath), ...overloads };
    assignDefaults(config);
    postProcessConfig(config);
    validateConfig(config);
    return config;
}

module.exports = {
    readConfig,
    validateConfig,
};
