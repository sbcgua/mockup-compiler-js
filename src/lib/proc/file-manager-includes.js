import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert';
import SimpleSHA1Stream from '../utils/sha1-stream.js';
import { slash } from '../utils/fs-utils.js';
import { FileManagerBase } from './file-manager-base.js';

const ITEM_PROCESSED = 'item-processed';

export default class IncludeFileManager extends FileManagerBase {
    #fileHashMap = new Map();
    #includeDirs = new Set();
    #includeRoot;
    #destDir;
    #withHashing = false;

    get fileHashMap() { return this.#fileHashMap }
    get testObjectList() { return [...this.#fileHashMap.keys()].map(f => f.toLowerCase()) }
    get srcDirs() { return [...this.#includeDirs] }

    /**
     * Create File pipeline
     * @param {string} includeDir source folder
     * @param {string} destDir destination folder
     * @param {boolean} withHashing enable hashing
     */
    constructor({destDir, includeDir, withHashing}) {
        assert(typeof destDir === 'string' && typeof includeDir === 'string');
        super();
        this.#includeRoot = includeDir;
        this.#destDir = destDir;
        this.#withHashing = withHashing;
        this.#validateParams();
    }

    #validateParams() {
        if (!fs.existsSync(this.#includeRoot)) throw Error('Include dir does not exist');
        if (!fs.existsSync(this.#destDir)) throw Error('Destination dir does not exist');
    }

    async processAll() {
        if (this.#fileHashMap.size > 0) throw Error('Cannot processAll twice');
        await this.#copyDir(this.#includeRoot, this.#destDir);
    }

    /**
     * Should include a file, if it is under includeRoot
     * update the hash, and include new files too and update the subdirs
     * @param {string} path to file to include
     */
    async processOneFile(filepath) {
        assert(typeof filepath === 'string');
        if (!filepath.startsWith(this.#includeRoot)) throw Error(`file path must be relative to includeRoot ${filepath}`);

        const relativePath = path.relative(this.#includeRoot, filepath);
        const destPath = path.join(this.#destDir, relativePath.toLowerCase());
        const destDir = path.dirname(destPath);
        this.#proveDestDir(destDir);
        await this.#copyFile(filepath, destPath);
    }

    #proveDestDir(destDir) {
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    }

    async #copyDir(srcDir, destDir) {
        this.#proveDestDir(destDir);
        const filesInDir = fs.readdirSync(srcDir);
        const promises = [];

        for (let f of filesInDir) {
            const srcPath = path.join(srcDir, f);
            const dstPath = path.join(destDir, f.toLowerCase());
            const attrs = fs.lstatSync(srcPath);
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
            const rs = fs.createReadStream(srcPath);
            rs.on('error', reject);
            var ws = fs.createWriteStream(dstPath);
            ws.on('error', reject);
            ws.on('finish', () => resolve(sha1s?.digest()));
            if (sha1s) {
                rs.pipe(sha1s);
                sha1s.pipe(ws);
            } else {
                rs.pipe(ws);
            }
        });
    }

    #emitIncludeProcessed({ name }) {
        this.emit(ITEM_PROCESSED, { name });
    }

}
