const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

function copyDir(src, dest) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest);
    const files = fs.readdirSync(src);
    const added = [];
    for (let f of files) {
        const srcPath = path.join(src, f);
        const dstPath = path.join(dest, f.toLowerCase());
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

async function zipFiles(rootDir, fileList, zipPath) {
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => resolve(archive.pointer()));
        archive.on('warning', (err) => reject(Object.assign(err, { _loc: 'zipFiles warning' })));
        archive.on('error', (err) => reject(Object.assign(err, { _loc: 'zipFiles error' })));
        archive.pipe(output);
        for (let name of fileList) archive.file(path.join(rootDir, name), { name });
        archive.finalize();
    });
}

module.exports = {
    copyDir,
    zipFiles,
};
