jest.mock('fs', () => require('memfs').fs);
const { vol } = require('memfs');
const IncludeFileManager = require('../include-file-manager');

beforeEach(() => {
    vol.reset();
});

test('should copy files and return proper results w/o hash', async () => {
    vol.fromJSON({
        './INCLUDE1.txt': '1',
        './sub1/include2.txt': '2',
        './sub2/sub22/include3.txt': '3',
    }, '/includes');

    const im = new IncludeFileManager({destDir: '/dest', includeDir: '/includes'});
    await im.includeDir();

    expect(im.includedFiles).toEqual([
        'INCLUDE1.txt',
        'sub1/include2.txt',
        'sub2/sub22/include3.txt',
    ]);
    expect([...im.fileHashMap.entries()]).toEqual([]);
    expect(im.includeDirs).toEqual([
        '/includes',
        '/includes/sub1',
        '/includes/sub2/sub22',
    ]);
    expect(vol.toJSON()).toEqual({
        '/dest/include1.txt': '1',
        '/dest/sub1/include2.txt': '2',
        '/dest/sub2/sub22/include3.txt': '3',
        '/includes/INCLUDE1.txt': '1',
        '/includes/sub1/include2.txt': '2',
        '/includes/sub2/sub22/include3.txt': '3',
    });
});

test('should copy files and return proper results with hashing', async () => {
    vol.fromJSON({
        './INCLUDE1.txt': '1',
        './sub1/include2.txt': '2',
        './sub2/sub22/include3.txt': '3',
    }, '/includes');

    const im = new IncludeFileManager({destDir: '/dest', includeDir: '/includes', withHashing: true});
    await im.includeDir();

    expect(im.includedFiles).toEqual([
        'INCLUDE1.txt',
        'sub1/include2.txt',
        'sub2/sub22/include3.txt',
    ]);
    expect([...im.fileHashMap.entries()]).toEqual([
        ['INCLUDE1.txt', '356a192b7913b04c54574d18c28d46e6395428ab'],
        ['sub1/include2.txt', 'da4b9237bacccdf19c0760cab7aec4a8359010b0'],
        ['sub2/sub22/include3.txt', '77de68daecd823babbb58edb1c8e14d7106e83bb'],
    ]);
    expect(im.includeDirs).toEqual([
        '/includes',
        '/includes/sub1',
        '/includes/sub2/sub22',
    ]);
    expect(vol.toJSON()).toEqual({
        '/dest/include1.txt': '1',
        '/dest/sub1/include2.txt': '2',
        '/dest/sub2/sub22/include3.txt': '3',
        '/includes/INCLUDE1.txt': '1',
        '/includes/sub1/include2.txt': '2',
        '/includes/sub2/sub22/include3.txt': '3',
    });
});

test('should copy one file update hash', async () => {
    vol.fromJSON({
        './INCLUDE1.txt': '1',
    }, '/includes');

    const im = new IncludeFileManager({destDir: '/dest', includeDir: '/includes', withHashing: true});
    await im.includeDir();

    vol.writeFileSync('/includes/INCLUDE1.txt', 'X');
    vol.writeFileSync('/includes/INCLUDE2.txt', 'Y');

    await im.includeOneFile('/includes/INCLUDE1.txt');
    await im.includeOneFile('/includes/INCLUDE2.txt');

    expect(im.includedFiles).toEqual([
        'INCLUDE1.txt',
        'INCLUDE2.txt',
    ]);
    expect([...im.fileHashMap.entries()]).toEqual([
        ['INCLUDE1.txt', 'c032adc1ff629c9b66f22749ad667e6beadf144b'],
        ['INCLUDE2.txt', '23eb4d3f4155395a74e9d534f97ff4c1908f5aac'],
    ]);
    expect(im.includeDirs).toEqual([
        '/includes',
    ]);
    expect(vol.toJSON()).toEqual({
        '/dest/include1.txt': 'X',
        '/dest/include2.txt': 'Y',
        '/includes/INCLUDE1.txt': 'X',
        '/includes/INCLUDE2.txt': 'Y',
    });
});

test('should copy one file and update dirs', async () => {
    vol.fromJSON({
        './INCLUDE1.txt': '1',
    }, '/includes');

    const im = new IncludeFileManager({destDir: '/dest', includeDir: '/includes', withHashing: true});
    await im.includeDir();

    vol.mkdirSync('/includes/sub1');
    vol.writeFileSync('/includes/sub1/include2.txt', '2');

    await im.includeOneFile('/includes/sub1/include2.txt');

    expect(im.includedFiles).toEqual([
        'INCLUDE1.txt',
        'sub1/include2.txt',
    ]);
    expect([...im.fileHashMap.entries()]).toEqual([
        ['INCLUDE1.txt', '356a192b7913b04c54574d18c28d46e6395428ab'],
        ['sub1/include2.txt', 'da4b9237bacccdf19c0760cab7aec4a8359010b0'],
    ]);
    expect(im.includeDirs).toEqual([
        '/includes',
        '/includes/sub1',
    ]);
    expect(vol.toJSON()).toEqual({
        '/dest/include1.txt': '1',
        '/dest/sub1/include2.txt': '2',
        '/includes/INCLUDE1.txt': '1',
        '/includes/sub1/include2.txt': '2',
    });
});

test('should throw on file with another root', async () => {
    vol.fromJSON({
        './INCLUDE1.txt': '1',
    }, '/includes');

    const im = new IncludeFileManager({destDir: '/dest', includeDir: '/includes', withHashing: true});
    await im.includeDir();

    await expect(im.includeOneFile('/another/include3.txt')).rejects.toThrowError('must be relative');
});
