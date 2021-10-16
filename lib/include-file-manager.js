const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { slash } = require('./utils/fs-utils');
const SimpleSHA1Stream = require('./utils/sha1-stream');
// const crypto = require('crypto');

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
        this.#includedFiles = [];
        this.#fileHashMap = new Map();
        this.#includeDirs = new Set();
    }

    get includedFiles() { return this.#includedFiles }
    get fileHashMap() { return this.#fileHashMap }
    get includeDirs() { return [...this.#includeDirs] }

    async processDir() {
        this.#initResults();
        await this.#copyDir(this.#includeRoot, this.#destDir);
    }

    async #copyDir(srcDir, destDir) {
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir);
        const filesInDir = fs.readdirSync(srcDir);

        for (let f of filesInDir) {
            const srcPath = path.join(srcDir, f);
            const dstPath = path.join(destDir, f.toLowerCase());
            const attrs = fs.lstatSync(srcPath);
            if (attrs.isDirectory()) {
                await this.#copyDir(srcPath, dstPath);
            } else {
                // fs.copyFileSync(srcPath, dstPath);
                const hash = await this.#copyFile(srcPath, dstPath);
                const relativePath = slash(path.relative(this.#includeRoot, srcPath));
                this.#includedFiles.push(relativePath);
                this.#includeDirs.add(slash(srcDir));
                if (this.#withHashing) {
                    this.#fileHashMap.set(relativePath, hash);
                }
            }
        }
    }

    #copyFile(srcPath, dstPath) {
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
