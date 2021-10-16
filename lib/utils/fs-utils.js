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

module.exports = {
    copyDir,
    writeFileAsync: promisify(fs.writeFile),
    readFileAsync: promisify(fs.readFile),
};
