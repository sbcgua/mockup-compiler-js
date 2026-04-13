import fs, { type ReadStream } from 'node:fs';
import path from 'node:path';
import type { BundleItemGenerator, BundlerContract, BundlerFunction } from '../types';

type ReadableFsLike = {
    createReadStream(path: string): ReadStream;
};
type BundlerParams = {
    sourceDir: string;
    bundlePath: string;
    memfs?: ReadableFsLike | null;
    bundleFn: BundlerFunction;
};

function createItemGenerator(sourceDir: string, fileList: string[], memfs?: ReadableFsLike | null): BundleItemGenerator {
    return function* () {
        for (const name of fileList) {
            const filePath = path.join(sourceDir, name);
            const readStream = memfs
                ? memfs.createReadStream(filePath)
                : fs.createReadStream(filePath);
            yield { name, readStream };
        }
    };
}

export class Bundler implements BundlerContract {
    #sourceDir: string;
    #bundlePath: string;
    #bundlerFn: BundlerFunction;
    #memfs?: ReadableFsLike | null;

    constructor({ sourceDir, bundlePath, memfs, bundleFn }: BundlerParams) {
        this.#sourceDir = sourceDir;
        this.#bundlePath = bundlePath;
        this.#memfs = memfs;
        this.#bundlerFn = bundleFn;
    }

    #deleteBundleFile(): void {
        if (fs.existsSync(this.#bundlePath)) fs.rmSync(this.#bundlePath);
    }

    async bundle(fileList: string[]): Promise<number> {
        if (!fileList || !Array.isArray(fileList) || fileList.length === 0) {
            throw new Error('Invalid file list provided for bundling');
        }

        this.#deleteBundleFile();

        const sortedFileList = [...fileList].sort();
        const ostr = fs.createWriteStream(this.#bundlePath);
        const itemGenerator = createItemGenerator(this.#sourceDir, sortedFileList, this.#memfs);

        const worker = new Promise<number>((resolve, reject) => {
            ostr.on('close', () => ostr.errored ? reject(ostr.errored) : resolve(ostr.bytesWritten));
            ostr.on('error', reject);
            void this.#bundlerFn(itemGenerator, ostr);
        });

        return await worker;
    }

    get bundlePath(): string { return this.#bundlePath; }
}
