import archiver from 'archiver';
import { PassThrough } from 'node:stream';
import { TextBundler } from './mc-text-format.ts';
import type { BundleItem, BundleItemGenerator, BundleOutputStream } from '../types';

const DEFAULT_TEXT_BUNDLE_NAME = 'bundle.txt';

function once<T extends unknown[]>(fn: (...args: T) => void): (...args: T) => void {
    let called = false;
    return (...args: T) => {
        if (called) return;
        called = true;
        fn(...args);
    };
}

function generatorFromArray(array: BundleItem[]): BundleItemGenerator {
    return function* () {
        for (const item of array) {
            yield item;
        }
    };
}

export async function buildZipBundle(itemGenerator: BundleItemGenerator, ostr: BundleOutputStream): Promise<void> {
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('warning', (err: Error) => { throw Object.assign(err, { _loc: 'zipFiles warning' }) });
    archive.on('error', (err: Error) => { throw Object.assign(err, { _loc: 'zipFiles error' }) });
    archive.pipe(ostr);

    for (const { name, readStream } of itemGenerator()) {
        await new Promise<void>((resolve, reject) => {
            readStream.on('end', resolve);
            readStream.on('error', reject);
            archive.append(readStream, { name });
        });
    }

    await archive.finalize();
}

export async function buildTextBundle(itemGenerator: BundleItemGenerator, ostr: BundleOutputStream): Promise<void> {
    const bundler = new TextBundler(ostr);

    for (const { name, readStream } of itemGenerator()) {
        await bundler.append(name, readStream);
    }

    bundler.end();
}

export async function buildTextZipBundle(itemGenerator: BundleItemGenerator, ostr: BundleOutputStream): Promise<void> {
    let textBundleSize = 0;
    const passThroughStream = new PassThrough();

    passThroughStream.on('data', (chunk: Buffer) => { textBundleSize += chunk.length });
    passThroughStream.on('end', () => {
        if (passThroughStream.errored) {
            console.error(passThroughStream.errored);
        } else {
            console.log('Uncompressed text bundle size:', textBundleSize);
        }
    });
    passThroughStream.on('resume', once(() => {
        void buildTextBundle(itemGenerator, passThroughStream);
    }));

    await buildZipBundle(generatorFromArray([{ name: DEFAULT_TEXT_BUNDLE_NAME, readStream: passThroughStream }]), ostr);
}
