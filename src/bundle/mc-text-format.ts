import type { BundleItem, BundleOutputStream } from '../types/index';

type BundleReadStream = BundleItem['readStream'];

export class TextBundler {
    #ostr: BundleOutputStream;
    #fileCount = 0;

    constructor(ostr: BundleOutputStream) {
        if (!ostr || typeof ostr.write !== 'function' || typeof ostr.end !== 'function') {
            throw new Error('Invalid output stream provided');
        }
        this.#ostr = ostr;
    }

    async append(name: string, readStream: BundleReadStream): Promise<void> {
        if (!name || typeof name !== 'string') throw new Error('Invalid file name provided');
        if (!readStream || typeof readStream.on !== 'function') throw new Error('Invalid read stream provided');

        if (this.#fileCount === 0) this.#writeHeader();

        await this.#renderOneFile(name, readStream);
        this.#fileCount++;
    }

    end(): void {
        this.#writeFooter();
        this.#ostr.end();
    }

    #writeHeader(): void {
        this.#ostr.write('!!MOCKUP-LOADER-FORMAT 1.0\n');
    }

    #writeFooter(): void {
        this.#ostr.write('\n');
        this.#ostr.write(`!!FILE-COUNT ${this.#fileCount}`);
    }

    async #renderOneFile(name: string, readStream: BundleReadStream): Promise<void> {
        let data = '';

        readStream.setEncoding('utf-8');
        await new Promise<void>((resolve, reject) => {
            readStream.on('data', (chunk: string) => { data += chunk });
            readStream.on('end', resolve);
            readStream.on('error', reject);
            readStream.resume();
        });

        const lines = data.split('\n');
        while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
            lines.pop();
        }
        const dataLines = lines.length;
        lines.push('');

        this.#ostr.write('\n');
        this.#ostr.write(`!!FILE ${name} text ${dataLines}\n`);
        this.#ostr.write(lines.join('\n'));
    }
}
