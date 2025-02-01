import { createWriteStream, readFileSync } from 'node:fs';
import { join } from 'node:path';

export function buildTextBundle(rootDir, fileList, destPath) {
    const bundler = new TextBundler(rootDir, fileList, destPath);
    return bundler.bundle();
}

class TextBundler {
    #rootDir;
    #destPath;
    #fileList;

    constructor(rootDir, fileList, destPath) {
        this.#rootDir  = rootDir;
        this.#destPath = destPath;
        this.#fileList = [...fileList].sort();
    }

    bundle() {
        return new Promise((resolve, reject) => {
            const os = createWriteStream(this.#destPath);
            os.on('close', () => os.errored || resolve(os.bytesWritten));
            os.on('error', reject);
            try {
                this.#render(os);
                os.end();
            } catch (error) {
                os.destroy(error);
            }
        });
    }
    #render(os) {
        os.write('!!MOCKUP-LOADER-FORMAT 1.0\n');
        for (const name of this.#fileList) {
            const last = (name === this.#fileList.at(-1));
            this.#renderOneFile(os, name, last);
        }
    }
    #renderOneFile(os, name, last = false) {
        const filePath = join(this.#rootDir, name);
        const data = readFileSync(filePath, 'utf-8'); // suppose it's a text file
        const lines = data.split('\n');

        // trim trailing empty lines
        while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
            lines.pop();
        }
        const dataLines = lines.length;
        if (!last) lines.push(''); // add a blank line at the end

        // os.write('\n'); // ??
        os.write(`!!FILE ${name} text ${dataLines}\n`);
        os.write(lines.join('\n'));
    }
}
