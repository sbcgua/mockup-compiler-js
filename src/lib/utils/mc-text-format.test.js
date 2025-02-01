import { describe, test, expect, vi, beforeEach } from 'vitest';
import { vol } from 'memfs';
import { buildTextBundle } from './mc-text-format';

vi.mock('node:fs', async () => {
    const memfs = await vi.importActual('memfs');
    return { default: memfs.fs, ...memfs.fs };
});

describe('mc-text-format: buildTextBundle', () => {
    const rootDir = '/mock/root';
    const destPath = '/mock/dest/bundle.txt';
    const fileList = ['file2.txt', 'file1.txt', 'file3.txt']; // Intentionally not sorted

    beforeEach(() => {
        vol.reset();
    });

    test('should bundle files into one output file', async () => {
        vol.fromJSON({ // Intentianally not sorted
            '/mock/root/file1.txt': 'Content 1\n2nd line\n\n',
            '/mock/root/file2.txt': 'Content 2',
            '/mock/root/file3.txt': 'Content 3',
            '/mock/dest/': {}, // Ensure dest directory exists
        });

        const expectedContent = [
            '!!MOCKUP-LOADER-FORMAT 1.0',
            '!!FILE file1.txt text 2',
            'Content 1',
            '2nd line',
            '!!FILE file2.txt text 1',
            'Content 2',
            '!!FILE file3.txt text 1',
            'Content 3',
        ].join('\n');

        const bytesWritten = await buildTextBundle(rootDir, fileList, destPath);
        expect(vol.readFileSync(destPath, 'utf-8')).toEqual(expectedContent);
        expect(bytesWritten).toBe(expectedContent.length);
    });

    test('should reject if an error occurs while reading files', async () => {
        vol.fromJSON({
            '/mock/dest/': {}, // Ensure dest directory exists
        });

        await expect(buildTextBundle(rootDir, fileList, destPath)).rejects.toThrow(/no such file or directory.*file1/);
    });

    test('should reject if an error occurs while writing to output', async () => {
        vol.fromJSON({
            '/mock/root/file1.txt': 'Content 1\n2nd line\n\n',
            '/mock/root/file2.txt': 'Content 2',
            '/mock/root/file3.txt': 'Content 3',
        });

        await expect(buildTextBundle(rootDir, fileList, destPath)).rejects.toThrow(/no such file or directory.*dest/);
    });
});