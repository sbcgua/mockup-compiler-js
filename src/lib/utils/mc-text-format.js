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
        this.#fileList = fileList.toSorted();
    }

    bundle() {
        return new Promise((resolve, reject) => {
            const ostr = createWriteStream(this.#destPath);
            ostr.on('close', () => ostr.errored ? reject(ostr.errored) : resolve(ostr.bytesWritten));
            ostr.on('error', reject);

            try {
                this.#render(ostr);
                ostr.end();
            } catch (error) {
                ostr.destroy(error);
            }
        });
    }
    #render(ostr) {
        ostr.write('!!MOCKUP-LOADER-FORMAT 1.0\n');
        for (const name of this.#fileList) {
            this.#renderOneFile(ostr, name);
        }
        ostr.write('\n');
        ostr.write(`!!FILE-COUNT ${this.#fileList.length}`);
        // ostr.write('!!EOF\n');
    }
    #renderOneFile(ostr, name) {
        const filePath = join(this.#rootDir, name);
        const data = readFileSync(filePath, 'utf-8'); // suppose it's a text file
        const lines = data.split('\n');

        // trim trailing empty lines
        while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
            lines.pop();
        }
        const dataLines = lines.length;
        lines.push(''); // add a blank line at the end

        ostr.write('\n');
        ostr.write(`!!FILE ${name} text ${dataLines}\n`);
        ostr.write(lines.join('\n'));
    }
}
