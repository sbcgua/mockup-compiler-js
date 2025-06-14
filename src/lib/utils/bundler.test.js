import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import { Bundler } from './bundler.js';

vi.mock('node:fs');

describe('Bundler', () => {
    let bundler;
    let bundlerFn;
    const sourceDir = '/root';
    const bundlePath = '/root/archive.zip';

    beforeEach(() => {
        bundlerFn = vi.fn(() => 123);
        bundler = new Bundler({ sourceDir, bundlePath, bundlerFn });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    test('deleteZipFile should delete zip file if it exists', () => {
        fs.existsSync.mockReturnValue(true);

        bundler.bundle();

        expect(fs.existsSync).toHaveBeenCalledWith(bundlePath);
        expect(fs.rmSync).toHaveBeenCalledWith(bundlePath);
    });

    test('deleteZipFile should not delete zip file if it does not exist', () => {
        fs.existsSync.mockReturnValue(false);

        bundler.bundle();

        expect(fs.existsSync).toHaveBeenCalledWith(bundlePath);
        expect(fs.rmSync).not.toHaveBeenCalled();
    });

    test('bundle should call bundlerFn with correct arguments', async () => {
        const files = ['file1.txt', 'file2.txt'];
        const result = await bundler.bundle(files);

        expect(result).toBe(123);
        expect(bundlerFn).toHaveBeenCalledWith(sourceDir, files, bundlePath);
    });
});