import crypto from 'node:crypto';
import { PassThrough } from 'node:stream';

export default class SimpleSHA1Stream extends PassThrough {
    constructor() {
        super();
        this.hash = crypto.createHash('sha1');
    }
    digest() {
        return this.hash.digest().toString('hex');
    }
    _transform (chunk, encoding, done) {
        this.hash.update(chunk);
        this.push(chunk);
        done();
    }
}
