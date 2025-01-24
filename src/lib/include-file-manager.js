import path from 'node:path';
import assert from 'node:assert';
import EventEmitter from 'node:events';
import SimpleSHA1Stream from './utils/sha1-stream.js';
import { slash } from './utils/fs-utils.js';

export default class IncludeFileManager extends EventEmitter {
    #fileHashMap;
    #includeDirs;
    #includeRoot;
    #destDir;
    #withHashing = false;
    #fs;

    constructor({destDir, withHashing, includeDir, fs}) {
        super();
        assert(typeof destDir === 'string' && typeof includeDir === 'string');
        this.#fs = fs;
        this.#includeRoot = includeDir;
        this.#destDir = destDir;
        this.#withHashing = withHashing;
        this.#validateParams();
        this.#initResults();
    }

    #validateParams() {
        if (!this.#fs.existsSync(this.#includeRoot)) throw Error('Include dir does not exist');
        if (!this.#fs.existsSync(this.#destDir)) throw Error('Destination dir does not exist');
    }

    #initResults() {
        this.#fileHashMap = new Map();
        this.#includeDirs = new Set();
    }

    get fileHashMap() { return this.#fileHashMap }
    get copiedFileList() { return [...this.#fileHashMap.keys()].map(f => f.toLowerCase()) }
    get includeDirs() { return [...this.#includeDirs] }

    async processDir() {
        this.#initResults();
        await this.#copyDir(this.#includeRoot, this.#destDir);
    }

    /**
     * Should include a file, if it is under includeRoot
     * update the hash, and include new files too and update the subdirs
     * @param {string} path to file to include
     */
    async includeOneFile(srcPath) {
        assert(typeof srcPath === 'string');
        if (!srcPath.startsWith(this.#includeRoot)) throw Error(`file path must be relative to includeRoot ${srcPath}`);
        const relativePath = path.relative(this.#includeRoot, srcPath);
        const destPath = path.join(this.#destDir, relativePath.toLowerCase());
        const destDir = path.dirname(destPath);
        if (!this.#fs.existsSync(destDir)) this.#fs.mkdirSync(destDir, { recursive: true });
        await this.#copyFile(srcPath, destPath);
    }

    async #copyDir(srcDir, destDir) {
        if (!this.#fs.existsSync(destDir)) this.#fs.mkdirSync(destDir);
        const filesInDir = this.#fs.readdirSync(srcDir);
        const promises = [];

        for (let f of filesInDir) {
            const srcPath = path.join(srcDir, f);
            const dstPath = path.join(destDir, f.toLowerCase());
            const attrs = this.#fs.lstatSync(srcPath);
            promises.push(attrs.isDirectory()
                ? this.#copyDir(srcPath, dstPath)
                : this.#copyFile(srcPath, dstPath));
        }
        await Promise.all(promises);
    }

    async #copyFile(srcPath, dstPath) {
        const hash = await this.#doFileCopyAndHash(srcPath, dstPath);
        const relativePath = slash(path.relative(this.#includeRoot, srcPath));
        this.#emitIncludeProcessed({ name: relativePath });
        this.#includeDirs.add(slash(path.dirname(srcPath)));
        this.#fileHashMap.set(relativePath, hash);
    }

    #doFileCopyAndHash(srcPath, dstPath) {
        return new Promise((resolve, reject) => {
            const sha1s = this.#withHashing ? new SimpleSHA1Stream() : null;
            const rs = this.#fs.createReadStream(srcPath);
            rs.on('error', reject);
            var ws = this.#fs.createWriteStream(dstPath);
            ws.on('error', reject);
            ws.on('finish', () => resolve(this.#withHashing ? sha1s.digest() : null));
            if (this.#withHashing) {
                rs.pipe(sha1s);
                sha1s.pipe(ws);
            } else {
                rs.pipe(ws);
            }
        });
    }

    #emitIncludeProcessed({ name }) {
        this.emit('include-processed', { name });
    }

}
