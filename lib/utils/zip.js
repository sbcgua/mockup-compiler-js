const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

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
    zipFiles,
};
