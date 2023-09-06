import SimpleSha1Stream from '../sha1-stream';
import { PassThrough } from 'stream';

test('should calculate sha1', () => {
    const sha1 = new SimpleSha1Stream();
    sha1.write('abc');
    expect(sha1.digest()).toBe('a9993e364706816aba3e25717850c26c9cd0d89d');
});

test('should pipe through', async () => {
    const s1 = new PassThrough();
    const sha1 = new SimpleSha1Stream();
    const s2 = new PassThrough();
    s1.pipe(sha1);
    sha1.pipe(s2);

    const promise = new Promise((resolve) => {
        s2.on('finish', () => resolve(sha1.digest()));
    });

    s1.write('Hello');
    s1.end('world');

    expect(await promise).toBe('1c3c3fa0a32abf3473a3e88f07a377025e28c03e');
});