import fs from 'node:fs';
import path from 'node:path';
import archiver from 'archiver';

export function zipFiles(rootDir, fileList, zipPath) {
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
