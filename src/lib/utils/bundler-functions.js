import archiver from 'archiver';
import { PassThrough } from 'node:stream';
import { TextBundler } from './mc-text-format.ts';

/** @typedef {import('../types').BundleItemGenerator} BundleItemGenerator */
/** @typedef {import('../types').BundleOutputStream} BundleOutputStream */

/**
 * @param {BundleItemGenerator} itemGenerator
 * @param {BundleOutputStream} ostr
 */
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

/**
 * @param {BundleItemGenerator} itemGenerator
 * @param {BundleOutputStream} ostr
 */
export async function buildTextBundle(itemGenerator, ostr) {
    const bundler = new TextBundler(ostr);

    for (const { name, readStream } of itemGenerator()) {
        await bundler.append(name, readStream);
    }

    bundler.end();
}

const DEFAULT_TEXT_BUNDLE_NAME = 'bundle.txt';

function once(fn) {
    let called = false;
    return (...args) => {
        if (called) return;
        called = true;
        return fn(...args);
    };
}

/**
 * @param {import('../types').BundleItem[]} array
 * @returns {BundleItemGenerator}
 */
function generatorFromArray(array) {
    return function* () {
        for (const item of array) {
            yield item;
        }
    };
}

/**
 * @param {BundleItemGenerator} itemGenerator
 * @param {BundleOutputStream} ostr
 */
export async function buildTextZipBundle(itemGenerator, ostr) {
    let textBundleSize = 0;
    const passThroughStream = new PassThrough();

    passThroughStream.on('data', chunk => { textBundleSize += chunk.length });
    passThroughStream.on('end', () => {
        if (passThroughStream.errored) {
            console.error(passThroughStream.errored);
            // ostr.destroy(error); ?
        } else {
            console.log('Uncompressed text bundle size:', textBundleSize);
        }
    });
    passThroughStream.on('resume', once(() => {
        buildTextBundle(itemGenerator, passThroughStream);
    }));

    await buildZipBundle(generatorFromArray([ { name: DEFAULT_TEXT_BUNDLE_NAME, readStream: passThroughStream } ]), ostr);
}
