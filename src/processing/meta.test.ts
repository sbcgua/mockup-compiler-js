import { fs, vol } from 'memfs';
import { mock, test, expect, describe, beforeEach } from 'bun:test';
import type { FileManagerContract } from '../types/index';

mock.module('node:fs', () => ({ default: fs, ...fs }));
const { default: MetaCalculator } = await import('./meta.ts');

describe('MetaCalculator', () => {
    const asFileManager = (value: Partial<FileManagerContract>): FileManagerContract => value as FileManagerContract;

    beforeEach(() => {
        vol.reset();
        vol.fromJSON({
            '/dest': null,
        });
    });

    test('should calculate meta', async () => {
        const m = new MetaCalculator({
            memfs: fs,
            excelFileManager: asFileManager({
                fileHashMap: new Map([
                    ['file1', 'hash1'],
                    ['file2', 'hash2'],
                ]),
                mockHashMap: new Map([
                    ['@file1/mock1', 'hashM1'],
                ]),
            }),
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
            memfs: fs,
            excelFileManager: asFileManager({
                fileHashMap: new Map([
                    ['file1', 'hash1'],
                    ['file2', 'hash2'],
                ]),
                mockHashMap: new Map([
                    ['@file1/mock1', 'hashM1'],
                ]),
            }),
            includeFileManager: asFileManager({
                fileHashMap: new Map([
                    ['/extra/inc1', 'H1'],
                    ['\\extra\\inc2', 'H2'],
                ]),
            }),
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
            memfs: fs,
            excelFileManager: asFileManager({}),
            eol: 'lf',
            destDir: '/dest',
        });
        expect(m.metaDirName).toBe('.meta');
        expect(m.metaSrcFileName).toBe('.meta/src_files');
    });

});
