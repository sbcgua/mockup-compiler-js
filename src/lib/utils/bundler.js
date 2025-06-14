import fs from 'node:fs';

export class Bundler {
    #uncompressedDir;
    #bundlePath;
    #bundlerFn;
    constructor({uncompressedDir, bundlePath, bundlerFn}) {
        this.#uncompressedDir = uncompressedDir;
        this.#bundlePath = bundlePath;
        this.#bundlerFn = bundlerFn;
    }
    #deleteBundleFile() {
        if (fs.existsSync(this.#bundlePath)) fs.rmSync(this.#bundlePath);
    }
    bundle(files) {
        this.#deleteBundleFile();
        return this.#bundlerFn(this.#uncompressedDir, files, this.#bundlePath);
    }
    get destination() { return this.#bundlePath }
}