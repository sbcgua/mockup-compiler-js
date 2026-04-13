// @ts-check

import crypto from 'node:crypto';
import { PassThrough } from 'node:stream';

export default class SimpleSHA1Stream extends PassThrough {
    /** @type {import('node:crypto').Hash} */
    hash;

    constructor() {
        super();
        this.hash = crypto.createHash('sha1');
    }

    /**
     * @returns {string}
     */
    digest() {
        return this.hash.digest().toString('hex');
    }

    /**
     * @param {Buffer | string} chunk
     * @param {BufferEncoding} encoding
     * @param {(error?: Error | null, data?: Buffer | string) => void} done
     */
    _transform (chunk, encoding, done) {
        this.hash.update(chunk);
        this.push(chunk);
        done();
    }
}
