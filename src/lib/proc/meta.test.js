import { fs, vol } from 'memfs';
import { vi, test, expect, describe, beforeEach } from 'vitest';
import MetaCalculator from './meta.js';

vi.mock('node:fs', async () => {
    // https://stackoverflow.com/questions/74841423/how-to-mock-file-system-with-memfs-in-nodejs
    // https://kschaul.com/til/2024/06/26/mock-fs-with-vitest-and-memfs/
    const memfs = await vi.importActual('memfs');
    return { default: memfs.fs, ...memfs.fs };
});

describe('MetaCalculator', () => {

    beforeEach(() => {
        vol.reset();
        vol.fromJSON({
            '/dest': null,
        });
    });

    test('should calculate meta', async () => {
        const m = new MetaCalculator({
            fs,
            excelFileManager: {
                fileHashMap: new Map([
                    ['file1', 'hash1'],
                    ['file2', 'hash2'],
                ]),
                mockHashMap: new Map([
                    ['@file1/mock1', 'hashM1'],
                ]),
            },
            eol: 'lf',
            destDir: '/dest',
        });
        const expMeta = [
            ['TYPE\tSRC_FILE\tSHA1'],
            ['M\t@file1/mock1\thashM1'],
            ['X\tfile1\thash1'],
            ['X\tfile2\thash2'],
        ].join('\n');
        await m.buildAndSave();
        expect(vol.toJSON()).toEqual({
            '/dest/.meta/src_files': expMeta,
        });
    });

    test('should calculate meta with includes', async () => {
        const m = new MetaCalculator({
            fs,
            excelFileManager: {
                fileHashMap: new Map([
                    ['file1', 'hash1'],
                    ['file2', 'hash2'],
                ]),
                mockHashMap: new Map([
                    ['@file1/mock1', 'hashM1'],
                ]),
            },
            includeFileManager: {
                fileHashMap: new Map([
                    ['/extra/inc1', 'H1'],
                    ['\\extra\\inc2', 'H2'],
                ]),
            },
            eol: 'lf',
            destDir: '/dest',
        });
        const expMeta = [
            ['TYPE\tSRC_FILE\tSHA1'],
            ['I\t/extra/inc1\tH1'],
            ['I\t/extra/inc2\tH2'],
            ['M\t@file1/mock1\thashM1'],
            ['X\tfile1\thash1'],
            ['X\tfile2\thash2'],
        ].join('\n');
        await m.buildAndSave();
        expect(vol.toJSON()).toEqual({
            '/dest/.meta/src_files': expMeta,
        });
    });

    test('should getters', () => {
        const m = new MetaCalculator({
            fs,
            excelFileManager: {},
            eol: 'lf',
            destDir: '/dest',
        });
        expect(m.metaDirName).toBe('.meta');
        expect(m.metaSrcFileName).toBe('.meta/src_files');
    });

});