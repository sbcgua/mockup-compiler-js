import { createWriteStream } from 'node:fs';
import path from 'node:path';
import archiver from 'archiver';

export function zipFiles(rootDir, fileList, zipPath) {
    return new Promise((resolve, reject) => {
        const archive = archiver('zip', { zlib: { level: 9 } });

        const ostr = createWriteStream(zipPath);
        ostr.on('close', () => ostr.errored ? reject(ostr.errored) : resolve(ostr.bytesWritten)); // archive.pointer()
        ostr.on('error', reject);

        archive.on('warning', (err) => reject(Object.assign(err, { _loc: 'zipFiles warning' })));
        archive.on('error', (err) => reject(Object.assign(err, { _loc: 'zipFiles error' })));
        archive.pipe(ostr);

        for (let name of fileList) {
            archive.file(path.join(rootDir, name), { name });
        }

        archive.finalize();
    });
}
