const SimpleSha1Stream = require('../sha1-stream');

test('should calculate sha1', () => {
    const sha1 = new SimpleSha1Stream();
    sha1.write('abc');
    expect(sha1.digest()).toBe('a9993e364706816aba3e25717850c26c9cd0d89d');
});
