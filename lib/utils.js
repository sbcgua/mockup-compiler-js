const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest);
    const files = fs.readdirSync(src);
    const added = [];
    for (let f of files) {
        const srcPath = path.join(src, f);
        const dstPath = path.join(dest, f);
        const attrs = fs.lstatSync(srcPath);
        if(attrs.isDirectory()) {
            const list = copyDir(srcPath, dstPath);
            added.push(...list);
        // } else if(attrs.isSymbolicLink()) {
        //     var symlink = fs.readlinkSync(path.join(src, files[i]));
        //     fs.symlinkSync(symlink, path.join(dest, files[i]));
        } else {
            fs.copyFileSync(srcPath, dstPath);
            added.push(dstPath);
        }
    }
    return added;
}

module.exports = {
    copyDir,
};
