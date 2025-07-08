import { describe, test, expect, beforeEach } from 'vitest';
import { vol, fs } from 'memfs';
import { TextBundler } from './mc-text-format';

describe('mc-text-format: buildTextBundle', () => {
    beforeEach(() => {
        vol.reset();
    });

    test('should bundle files into one output file', async () => {
        vol.fromJSON({ // Intentianally not sorted
            '/file1.txt': 'Content 1\n2nd line\n\n',
            '/file2.txt': 'Content 2',
            '/file3.txt': 'Content 3',
        });

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

        await new Promise((resolve, reject) => {
            const writeStream = fs.createWriteStream('/bundle.txt'); // Create the destination file
            writeStream.on('close', resolve);
            writeStream.on('error', reject);
            const bundler = new TextBundler(writeStream);
            async function bundleFiles() {
                await bundler.append('file1.txt', fs.createReadStream('/file1.txt'));
                await bundler.append('file2.txt', fs.createReadStream('/file2.txt'));
                await bundler.append('file3.txt', fs.createReadStream('/file3.txt'));
                bundler.end();
            }
            bundleFiles();
        });

        expect(vol.readFileSync('/bundle.txt', 'utf-8')).toEqual(expectedContent);
    });
});