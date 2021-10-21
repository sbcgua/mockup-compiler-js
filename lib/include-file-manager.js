const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { slash } = require('./utils/fs-utils');
const SimpleSHA1Stream = require('./utils/sha1-stream');

class IncludeFileManager {
    #includedFiles;
    #fileHashMap;
    #includeDirs;
    #includeRoot;
    #destDir;
    #withHashing = false;

    constructor({destDir, withHashing, includeDir}) {
        assert(typeof destDir === 'string' && typeof includeDir === 'string');
        this.#includeRoot = includeDir;
        this.#destDir = destDir;
        this.#withHashing = withHashing;
        this.#initResults();
    }

    #initResults() {
        this.#includedFiles = new Set();
        this.#fileHashMap = new Map();
        this.#includeDirs = new Set();
    }

    get includedFiles() { return [...this.#includedFiles] }
    get fileHashMap() { return this.#fileHashMap }
    get includeDirs() { return [...this.#includeDirs] }

    async includeDir() {
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
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
        await this.#copyFile(srcPath, destPath);
    }

    async #copyDir(srcDir, destDir) {
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir);
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
        this.#includedFiles.add(relativePath);
        this.#includeDirs.add(slash(path.dirname(srcPath)));
        if (this.#withHashing) {
            this.#fileHashMap.set(relativePath, hash);
        }
    }

    #doFileCopyAndHash(srcPath, dstPath) {
        return new Promise((resolve, reject) => {
            const sha1s = this.#withHashing ? new SimpleSHA1Stream() : null;
            const rs = fs.createReadStream(srcPath);
            rs.on('error', reject);
            var ws = fs.createWriteStream(dstPath);
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

}

module.exports = IncludeFileManager;
