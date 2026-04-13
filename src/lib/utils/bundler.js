import fs from 'node:fs';
import path from 'node:path';

/** @typedef {import('../types').BundleItemGenerator} BundleItemGenerator */
/** @typedef {import('../types').BundlerFunction} BundlerFunction */
/** @typedef {import('../types').BundlerContract} BundlerContract */

/**
 * @param {string} sourceDir
 * @param {string[]} fileList
 * @param {typeof import('node:fs') | undefined} memfs
 * @returns {BundleItemGenerator}
 */
function createItemGenerator(sourceDir, fileList, memfs) {
    return function* () {
        for (let name of fileList) {
            const filePath = path.join(sourceDir, name);
            const readStream = memfs
                ? memfs.createReadStream(filePath)
                : fs.createReadStream(filePath);
            yield { name, readStream };
        }
    };
}

/** @implements {BundlerContract} */
export class Bundler {
    #sourceDir;
    #bundlePath;
    #bundlerFn;
    #memfs;
    /**
     * @param {{ sourceDir: string, bundlePath: string, memfs?: typeof import('node:fs'), bundleFn: BundlerFunction }} params
     */
    constructor({sourceDir, bundlePath, memfs, bundleFn}) {
        this.#sourceDir  = sourceDir;
        this.#bundlePath = bundlePath;
        this.#memfs      = memfs;
        this.#bundlerFn  = bundleFn;
    }
    #deleteBundleFile() {
        if (fs.existsSync(this.#bundlePath)) fs.rmSync(this.#bundlePath);
    }
    /**
     * @param {string[]} fileList
     * @returns {Promise<number>}
     */
    async bundle(fileList) {
        if (!fileList || !Array.isArray(fileList) || fileList.length === 0) {
            throw new Error('Invalid file list provided for bundling');
        }

        this.#deleteBundleFile();

        fileList = fileList.toSorted(); // Sort for consistency
        const ostr = fs.createWriteStream(this.#bundlePath);

        const itemGenerator = createItemGenerator(this.#sourceDir, fileList, this.#memfs);

        const worker = new Promise((resolve, reject) => {
            ostr.on('close', () => ostr.errored ? reject(ostr.errored) : resolve(ostr.bytesWritten));
            ostr.on('error', reject);
            this.#bundlerFn(itemGenerator, ostr);
        });

        return await worker;
    }
    get bundlePath() { return this.#bundlePath }
}
