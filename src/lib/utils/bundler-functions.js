import archiver from 'archiver';
import { PassThrough } from 'node:stream';
import { TextBundler } from './mc-text-format.js';

export async function buildZipBundle(itemGenerator, ostr) {
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('warning', (err) => { throw Object.assign(err, { _loc: 'zipFiles warning' }) });
    archive.on('error', (err) => { throw Object.assign(err, { _loc: 'zipFiles error' }) });
    archive.pipe(ostr);

    for (const { name, readStream } of itemGenerator()) {
        await new Promise((resolve, reject) => {
            readStream.on('end', resolve);
            readStream.on('error', reject);
            archive.append(readStream, { name });
        });
    }

    await archive.finalize();
}

export async function buildTextBundle(itemGenerator, ostr) {
    const bundler = new TextBundler(ostr);

    for (const { name, readStream } of itemGenerator()) {
        await bundler.append(name, readStream);
    }

    bundler.end();
}

const DEFAULT_TEXT_BUNDLE_NAME = 'bundle.txt';

export async function buildTextZipBundle(itemGenerator, ostr) {
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('warning', (err) => { throw Object.assign(err, { _loc: 'buildTextZipBundle warning' }) });
    archive.on('error', (err) => { throw Object.assign(err, { _loc: 'buildTextZipBundle error' }) });
    archive.pipe(ostr);

    let textBundleSize = 0;
    const passThroughStream = new PassThrough();
    passThroughStream.on('data', chunk => { textBundleSize += chunk.length });
    passThroughStream.on('end', () => {
        if (passThroughStream.errored) {
            console.error(passThroughStream.errored);
            // ostr.destroy(error); ?
        } else {
            console.log('Uncompressed text bundle size:', textBundleSize);
            archive.finalize();
        }
    });

    archive.append(passThroughStream, { name: DEFAULT_TEXT_BUNDLE_NAME });
    await buildTextBundle(itemGenerator, passThroughStream);
}
