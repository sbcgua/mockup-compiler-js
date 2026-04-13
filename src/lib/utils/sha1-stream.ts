import crypto, { type Hash } from 'node:crypto';
import { PassThrough } from 'node:stream';

export default class SimpleSHA1Stream extends PassThrough {
    hash: Hash;

    constructor() {
        super();
        this.hash = crypto.createHash('sha1');
    }

    digest(): string {
        return this.hash.digest().toString('hex');
    }

    _transform(chunk: Buffer | string, encoding: BufferEncoding, done: (error?: Error | null, data?: Buffer | string) => void): void {
        this.hash.update(chunk);
        this.push(chunk);
        done();
    }
}
