import { createWriteStream, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { PassThrough } from 'node:stream';
import archiver from 'archiver';

export function buildTextBundle(rootDir, fileList, destPath) {
    const bundler = new TextBundler(rootDir, fileList, destPath);
    return bundler.bundle();
}

const DEFAULT_TEXT_BUNDLE_NAME = 'bundle.txt';

export function buildTextZipBundle(rootDir, fileList, destPath) {
    const bundler = new TextBundler(rootDir, fileList, destPath);
    const passThroughStream = new PassThrough();
    const archive = archiver('zip', { zlib: { level: 9 } });
    const ostr = createWriteStream(destPath);

    return new Promise((resolve, reject) => {

        ostr.on('close', () => ostr.errored ? reject(ostr.errored) : resolve(ostr.bytesWritten));
        ostr.on('error', reject);

        archive.on('warning', err => reject(Object.assign(err, { _loc: 'buildTextZipBundle warning' })));
        archive.on('error', err => reject(Object.assign(err, { _loc: 'buildTextZipBundle error' })));
        // archive.on('close', err => console.log('archive close', err)  );
        archive.pipe(ostr);
        archive.append(passThroughStream, { name: DEFAULT_TEXT_BUNDLE_NAME });

        bundler.bundle(passThroughStream).then(textBundleSize => {
            console.log('Uncompressed text bundle size:', textBundleSize);
            archive.finalize(); // then?
        });

    });
}

class TextBundler {
    #rootDir;
    #destPath;
    #fileList;

    constructor(rootDir, fileList, destPath) {
        this.#rootDir  = rootDir;
        this.#destPath = destPath;
        this.#fileList = fileList.toSorted();
    }

    bundle(writeHere) {
        return new Promise((resolve, reject) => {
            const ostr = writeHere || createWriteStream(this.#destPath);
            let bytesWrittenCounter = 0;
            if (ostr.bytesWritten === undefined) { // For streams without bytesWritten prop
                ostr.on('data', (chunk) => { bytesWrittenCounter += chunk.length });
            }
            ostr.on('close', () => ostr.errored
                ? reject(ostr.errored)
                : resolve(ostr.bytesWritten ?? bytesWrittenCounter));
            ostr.on('error', reject);

            try {
                this.#render(ostr);
                ostr.end();
            } catch (error) {
                ostr.destroy(error);
            }
        });
    }
    #render(ostr) {
        ostr.write('!!MOCKUP-LOADER-FORMAT 1.0\n');
        for (const name of this.#fileList) {
            this.#renderOneFile(ostr, name);
        }
        ostr.write('\n');
        ostr.write(`!!FILE-COUNT ${this.#fileList.length}`);
        // ostr.write('!!EOF\n');
    }
    #renderOneFile(ostr, name) {
        const filePath = join(this.#rootDir, name);
        const data = readFileSync(filePath, 'utf-8'); // suppose it's a text file
        const lines = data.split('\n');

        // trim trailing empty lines
        while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
            lines.pop();
        }
        const dataLines = lines.length;
        lines.push(''); // add a blank line at the end

        ostr.write('\n');
        ostr.write(`!!FILE ${name} text ${dataLines}\n`);
        ostr.write(lines.join('\n'));
    }
}
