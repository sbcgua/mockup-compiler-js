export class TextBundler {
    #ostr;
    #fileCount = 0;

    constructor(ostr) {
        if (!ostr || typeof ostr.write !== 'function' || typeof ostr.end !== 'function') {
            throw new Error('Invalid output stream provided');
        }
        this.#ostr = ostr;
    }

    async append(name, readStream) {
        if (!name || typeof name !== 'string') throw new Error('Invalid file name provided');
        if (!readStream || typeof readStream.on !== 'function') throw new Error('Invalid read stream provided');

        if (this.#fileCount === 0) this.#writeHeader();

        await this.#renderOneFile(name, readStream);
        this.#fileCount++;
    }
    end() {
        this.#writeFooter();
        this.#ostr.end();
    }

    #writeHeader() {
        this.#ostr.write('!!MOCKUP-LOADER-FORMAT 1.0\n');
    }
    #writeFooter() {
        this.#ostr.write('\n');
        this.#ostr.write(`!!FILE-COUNT ${this.#fileCount}`);
    }
    async #renderOneFile(name, readStream) {
        let data = '';

        readStream.setEncoding('utf-8');
        await new Promise((resolve, reject) => {
            readStream.on('data', chunk => { data += chunk });
            readStream.on('end', resolve);
            readStream.on('error', reject);
            readStream.resume();
        });

        // trim trailing empty lines
        const lines = data.split('\n');
        while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
            lines.pop();
        }
        const dataLines = lines.length;
        lines.push(''); // add a blank line at the end

        this.#ostr.write('\n');
        this.#ostr.write(`!!FILE ${name} text ${dataLines}\n`);
        this.#ostr.write(lines.join('\n'));
    }
}
