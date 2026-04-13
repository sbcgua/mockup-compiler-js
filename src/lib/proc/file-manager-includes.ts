import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert';
import SimpleSHA1Stream from '../utils/sha1-stream.ts';
import { slash } from '../utils/fs-utils.ts';
import { FileManagerBase } from './file-manager-base.ts';
import type { FileManagerProcessedItemEvent } from '../types';

const ITEM_PROCESSED = 'item-processed';

type WritableFsLike = Pick<typeof fs, 'existsSync' | 'mkdirSync' | 'createWriteStream'>;
type IncludeFileManagerParams = {
    destDir: string;
    includeDir: string;
    withHashing?: boolean;
    memfs?: WritableFsLike;
};

export default class IncludeFileManager extends FileManagerBase {
    #fileHashMap = new Map<string, string | undefined>();
    #includeDirs = new Set<string>();
    #includeRoot: string;
    #destDir: string;
    #withHashing: boolean;
    #destFs: WritableFsLike;

    get fileHashMap(): Map<string, string | undefined> { return this.#fileHashMap; }
    get testObjectList(): string[] { return [...this.#fileHashMap.keys()].map(file => file.toLowerCase()); }
    get srcDirs(): string[] { return [...this.#includeDirs]; }

    constructor({ destDir, includeDir, withHashing = false, memfs }: IncludeFileManagerParams) {
        assert(typeof destDir === 'string' && typeof includeDir === 'string');
        super();
        this.#includeRoot = includeDir;
        this.#destDir = destDir;
        this.#withHashing = withHashing;
        this.#destFs = memfs || fs;
        this.#validateParams();
    }

    #validateParams(): void {
        if (!fs.existsSync(this.#includeRoot)) throw Error('Include dir does not exist');
        if (!this.#destFs.existsSync(this.#destDir)) throw Error('Destination dir does not exist');
    }

    async processAll(): Promise<void> {
        if (this.#fileHashMap.size > 0) throw Error('Cannot processAll twice');
        await this.#copyDir(this.#includeRoot, this.#destDir);
    }

    async processOneFile(filepath: string): Promise<void> {
        assert(typeof filepath === 'string');
        if (!filepath.startsWith(this.#includeRoot)) throw Error(`file path must be relative to includeRoot ${filepath}`);

        const relativePath = path.relative(this.#includeRoot, filepath);
        const destPath = path.join(this.#destDir, relativePath.toLowerCase());
        const destDir = path.dirname(destPath);
        this.#proveDestDir(destDir);
        await this.#copyFile(filepath, destPath);
    }

    #proveDestDir(destDir: string): void {
        if (!this.#destFs.existsSync(destDir)) this.#destFs.mkdirSync(destDir, { recursive: true });
    }

    async #copyDir(srcDir: string, destDir: string): Promise<void> {
        this.#proveDestDir(destDir);
        const filesInDir = fs.readdirSync(srcDir);
        const promises: Promise<void>[] = [];

        for (const fileName of filesInDir) {
            const srcPath = path.join(srcDir, fileName);
            const dstPath = path.join(destDir, fileName.toLowerCase());
            const attrs = fs.lstatSync(srcPath);
            promises.push(attrs.isDirectory()
                ? this.#copyDir(srcPath, dstPath)
                : this.#copyFile(srcPath, dstPath));
        }
        await Promise.all(promises);
    }

    async #copyFile(srcPath: string, dstPath: string): Promise<void> {
        const hash = await this.#doFileCopyAndHash(srcPath, dstPath);
        const relativePath = slash(path.relative(this.#includeRoot, srcPath));
        this.#emitIncludeProcessed({ name: relativePath });
        this.#includeDirs.add(slash(path.dirname(srcPath)));
        this.#fileHashMap.set(relativePath, hash);
    }

    #doFileCopyAndHash(srcPath: string, dstPath: string): Promise<string | undefined> {
        return new Promise((resolve, reject) => {
            const sha1s = this.#withHashing ? new SimpleSHA1Stream() : null;
            const rs = fs.createReadStream(srcPath);
            rs.on('error', reject);
            const ws = this.#destFs.createWriteStream(dstPath);
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

    #emitIncludeProcessed(payload: FileManagerProcessedItemEvent): void {
        this.emit(ITEM_PROCESSED, payload);
    }
}
