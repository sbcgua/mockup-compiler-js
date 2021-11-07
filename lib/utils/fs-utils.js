const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

function copyDir(src, dest) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest);
    const filesInDir = fs.readdirSync(src);
    const addedFiles = [];
    for (let f of filesInDir) {
        const srcPath = path.join(src, f);
        const dstPath = path.join(dest, f.toLowerCase());
        const attrs = fs.lstatSync(srcPath);
        if (attrs.isDirectory()) {
            const addedSubdirFiles = copyDir(srcPath, dstPath);
            addedFiles.push(...addedSubdirFiles);
        // } else if(attrs.isSymbolicLink()) {
        //     var symlink = fs.readlinkSync(path.join(src, files[i]));
        //     fs.symlinkSync(symlink, path.join(dest, files[i]));
        } else {
            fs.copyFileSync(srcPath, dstPath);
            addedFiles.push(dstPath);
        }
    }
    return addedFiles;
}

function slash(p) {
    return p.replace(/\\/g, '/');
}

function findCommonPath(paths) {
    if (paths.length === 0) return '';
    if (paths.length === 1) return paths[0];

    const sep = '/';
    const pathSegments = paths.map(i => i.split(sep));
    const shortestPathLen = Math.min(...pathSegments.map(p => p.length));

    let commonSegs = 0;
    for (let i = 0; i < shortestPathLen; i++) {
        const segValues = pathSegments.map(p => p[i]);
        const equal = segValues.slice(1).every(seg => seg === segValues[0]);
        if (equal) commonSegs++; else break;
    }

    return pathSegments[0].slice(0, commonSegs).join(sep);
}

module.exports = {
    copyDir,
    slash,
    writeFileAsync: promisify(fs.writeFile),
    readFileAsync: promisify(fs.readFile),
    findCommonPath,
};
