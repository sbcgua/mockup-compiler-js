import { fs, vol } from 'memfs';
import { jest } from '@jest/globals';
// jest.mock('fs', () => fs);

import IncludeFileManager from '../include-file-manager';

beforeEach(() => {
    vol.reset();
});

test('should copy files and return proper results w/o hash', async () => {
    vol.fromJSON({
        '/includes/INCLUDE1.txt': '1',
        '/includes/sub1/include2.txt': '2',
        '/includes/sub2/sub22/include3.txt': '3',
        '/dest': null
    });

    const im = new IncludeFileManager({
        fs,
        destDir: '/dest',
        includeDir: '/includes'
    });
    await im.processDir();

    expect([...im.fileHashMap.entries()]).toEqual([
        ['INCLUDE1.txt', null],
        ['sub1/include2.txt', null],
        ['sub2/sub22/include3.txt', null],
    ]);
    expect(im.copiedFileList).toEqual([
        'include1.txt',
        'sub1/include2.txt',
        'sub2/sub22/include3.txt',
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

test('should copy files and handle CASE properly', async () => {
    vol.fromJSON({
        '/includes/INCLUDE1.txt': '1',
        '/includes/SUB1/INCLUDE2.txt': '2',
        '/includes/SUB2/SUB22/INCLUDE3.txt': '3',
        '/dest': null
    });

    const im = new IncludeFileManager({
        fs,
        destDir: '/dest',
        includeDir: '/includes'
    });
    await im.processDir();

    expect([...im.fileHashMap.entries()]).toEqual([
        ['INCLUDE1.txt', null],
        ['SUB1/INCLUDE2.txt', null],
        ['SUB2/SUB22/INCLUDE3.txt', null],
    ]);
    expect(im.copiedFileList).toEqual([
        'include1.txt',
        'sub1/include2.txt',
        'sub2/sub22/include3.txt',
    ]);
    expect(im.includeDirs).toEqual([
        '/includes',
        '/includes/SUB1',
        '/includes/SUB2/SUB22',
    ]);
    expect(vol.toJSON()).toEqual({
        '/dest/include1.txt': '1',
        '/dest/sub1/include2.txt': '2',
        '/dest/sub2/sub22/include3.txt': '3',
        '/includes/INCLUDE1.txt': '1',
        '/includes/SUB1/INCLUDE2.txt': '2',
        '/includes/SUB2/SUB22/INCLUDE3.txt': '3',
    });
});

test('should copy files and return proper results with hashing', async () => {
    vol.fromJSON({
        '/includes/INCLUDE1.txt': '1',
        '/includes/sub1/include2.txt': '2',
        '/includes/sub2/sub22/include3.txt': '3',
        '/dest': null
    });

    const im = new IncludeFileManager({
        fs,
        destDir: '/dest',
        includeDir: '/includes',
        withHashing: true
    });
    await im.processDir();

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
        '/includes/INCLUDE1.txt': '1',
        '/dest': null
    });

    const im = new IncludeFileManager({
        fs,
        destDir: '/dest',
        includeDir: '/includes',
        withHashing: true
    });
    await im.processDir();

    vol.writeFileSync('/includes/INCLUDE1.txt', 'X');
    vol.writeFileSync('/includes/INCLUDE2.txt', 'Y');

    await im.includeOneFile('/includes/INCLUDE1.txt');
    await im.includeOneFile('/includes/INCLUDE2.txt');

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
        '/includes/INCLUDE1.txt': '1',
        '/dest': null
    });

    const im = new IncludeFileManager({
        fs,
        destDir: '/dest',
        includeDir: '/includes',
        withHashing: true
    });
    await im.processDir();

    vol.mkdirSync('/includes/sub1');
    vol.writeFileSync('/includes/sub1/include2.txt', '2');

    await im.includeOneFile('/includes/sub1/include2.txt');

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
        '/includes/INCLUDE1.txt': '1',
        '/dest': null
    });

    const im = new IncludeFileManager({
        fs,
        destDir: '/dest',
        includeDir: '/includes',
        withHashing: true
    });
    await im.processDir();

    await expect(im.includeOneFile('/another/include3.txt')).rejects.toThrowError('must be relative');
});

test('should fail on wrong params', () => {
    const initiationFn = () => new IncludeFileManager({
        fs,
        destDir: '/dest',
        includeDir: '/includes'
    });

    expect(initiationFn).toThrowError('Include dir');
    vol.mkdirSync('/includes');
    expect(initiationFn).toThrowError('Destination dir');
    vol.mkdirSync('/dest');
    expect(initiationFn).not.toThrowError();
});

test('should emit proper messages on include', async () => {
    vol.fromJSON({
        '/includes/INCLUDE1.txt': '1',
        '/includes/sub1/include2.txt': '2',
        '/includes/sub2/sub22/include3.txt': '3',
        '/dest': null,
    });

    const im = new IncludeFileManager({
        fs,
        destDir: '/dest',
        includeDir: '/includes'
    });
    const onEmit = jest.fn();
    im.on('include-processed', onEmit);
    await im.processDir();

    expect(onEmit.mock.calls).toEqual([
        [{ name: 'INCLUDE1.txt' }],
        [{ name: 'sub1/include2.txt' }],
        [{ name: 'sub2/sub22/include3.txt' }],
    ]);
});