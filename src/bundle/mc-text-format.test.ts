import { describe, test, expect } from 'bun:test';
import { Readable } from 'node:stream';
import { TextBundler } from './mc-text-format.ts';
import type { BundleOutputStream } from '../types/index';

describe('mc-text-format: buildTextBundle', () => {
    test('should bundle files into one output file', async () => {
        const expectedContent = [
            '!!MOCKUP-LOADER-FORMAT 1.0',
            '',
            '!!FILE file1.txt text 2',
            'Content 1',
            '2nd line',
            '',
            '!!FILE file2.txt text 1',
            'Content 2',
            '',
            '!!FILE file3.txt text 1',
            'Content 3',
            '',
            '!!FILE-COUNT 3',
        ].join('\n');

        let bundledText = '';
        const writeStream = {
            write: (chunk: string) => {
                bundledText += chunk;
                return true;
            },
            end: () => undefined,
        } as unknown as BundleOutputStream;
        const bundler = new TextBundler(writeStream);

        await bundler.append('file1.txt', Readable.from(['Content 1\n2nd line\n\n']));
        await bundler.append('file2.txt', Readable.from(['Content 2']));
        await bundler.append('file3.txt', Readable.from(['Content 3']));
        bundler.end();

        expect(bundledText).toEqual(expectedContent);
    });
});
