import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import archiver from 'archiver';
import { zipFiles, Zipper } from './zip.js';

vi.mock('node:fs');
vi.mock('node:path');
vi.mock('archiver');

describe('zipFiles', () => {
    let mockOutput, mockArchive;

    beforeEach(() => {
        mockOutput = {
            on: vi.fn(),
            close: vi.fn(),
        };
        mockArchive = {
            on: vi.fn(),
            pipe: vi.fn(),
            file: vi.fn(),
            finalize: vi.fn(),
            pointer: vi.fn().mockReturnValue(123),
        };
        fs.createWriteStream.mockReturnValue(mockOutput);
        archiver.mockReturnValue(mockArchive);
    });

    test('should zip files successfully', async () => {
        const rootDir = '/root';
        const fileList = ['file1.txt', 'file2.txt'];
        const zipPath = '/root/archive.zip';

        mockOutput.on.mockImplementation((event, callback) => {
            if (event === 'close') callback();
        });

        const result = await zipFiles(rootDir, fileList, zipPath);

        expect(result).toBe(123);
        expect(fs.createWriteStream).toHaveBeenCalledWith(zipPath);
        expect(archiver).toHaveBeenCalledWith('zip', { zlib: { level: 9 } });
        expect(mockArchive.pipe).toHaveBeenCalledWith(mockOutput);
        expect(mockArchive.file).toHaveBeenCalledWith(path.join(rootDir, 'file1.txt'), { name: 'file1.txt' });
        expect(mockArchive.file).toHaveBeenCalledWith(path.join(rootDir, 'file2.txt'), { name: 'file2.txt' });
        expect(mockArchive.finalize).toHaveBeenCalled();
    });

    test('should handle archive warning', async () => {
        const rootDir = '/root';
        const fileList = ['file1.txt', 'file2.txt'];
        const zipPath = '/root/archive.zip';

        mockArchive.on.mockImplementation((event, callback) => {
            if (event === 'warning') callback(new Error('warning'));
        });

        await expect(zipFiles(rootDir, fileList, zipPath)).rejects.toMatchObject({ message: 'warning', _loc: 'zipFiles warning' });
    });

    test('should handle archive error', async () => {
        const rootDir = '/root';
        const fileList = ['file1.txt', 'file2.txt'];
        const zipPath = '/root/archive.zip';

        mockArchive.on.mockImplementation((event, callback) => {
            if (event === 'error') callback(new Error('error'));
        });

        await expect(zipFiles(rootDir, fileList, zipPath)).rejects.toMatchObject({ message: 'error', _loc: 'zipFiles error' });
    });
});

describe('Zipper', () => {
    let zipper;
    const destDir = '/root';
    const zipPath = '/root/archive.zip';

    beforeEach(() => {
        zipper = new Zipper({ destDir, zipPath });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    test('deleteZipFile should delete zip file if it exists', () => {
        fs.existsSync.mockReturnValue(true);

        zipper.deleteZipFile();

        expect(fs.existsSync).toHaveBeenCalledWith(zipPath);
        expect(fs.rmSync).toHaveBeenCalledWith(zipPath);
    });

    test('deleteZipFile should not delete zip file if it does not exist', () => {
        fs.existsSync.mockReturnValue(false);

        zipper.deleteZipFile();

        expect(fs.existsSync).toHaveBeenCalledWith(zipPath);
        expect(fs.rmSync).not.toHaveBeenCalled();
    });

    test.skip('zipAsync should call zipFiles with correct arguments', async () => {
        const files = ['file1.txt', 'file2.txt'];
        // const zipFilesMock = vi.fn().mockResolvedValue(123);
        // vi.spyOn(zipFiles, 'zipFiles').mockImplementation(zipFilesMock);
        // vi.mock('./zip.js', { spy: true });

        const result = await zipper.zipAsync(files);

        expect(result).toBe(123);
        expect(zipFiles).toHaveBeenCalledWith(destDir, files, zipPath);
    });
});