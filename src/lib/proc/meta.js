import path from 'node:path';
import fs from 'node:fs';
import { sortBy } from 'lodash-es';
import { stringifyWithTabs } from '../utils/tabbed.js';
import { slash } from '../utils/fs-utils.js';

export default class MetaCalculator {
    #excelFileManager;
    #includeFileManager;
    #eol;
    #metaDir;
    #metaFilePath;
    #destFs;

    constructor({excelFileManager, includeFileManager, eol, destDir, memfs}) {
        this.#excelFileManager = excelFileManager;
        this.#includeFileManager = includeFileManager;
        this.#eol = eol;
        this.#destFs = memfs || fs;

        if (!this.#destFs.existsSync(destDir)) throw Error('Destination dir does not exist');
        this.#metaDir = path.join(destDir, this.metaDirName);
        this.#metaFilePath = path.join(destDir, this.metaSrcFileName);
    }
    get metaSrcFileName() { return '.meta/src_files' }
    get metaDirName() { return '.meta' }

    buildAndSave() {
        if (!this.#destFs.existsSync(this.#metaDir)) this.#destFs.mkdirSync(this.#metaDir);
        const metaData = this.#getSrcFilesMeta();
        return new Promise((resolve, reject) => {
            const stream = this.#destFs.createWriteStream(this.#metaFilePath, { encoding: 'utf8' });
            stream.on('finish', resolve);
            stream.on('error', reject);
            stream.write(metaData);
            stream.end();
        });
    }

    #getSrcFilesMeta() {
        const convertToArrayAndAddType =
            (map, type) => [...map.entries()].map(([file, sha1]) => [slash(file), sha1, type]);

        const allFiles = [
            ...convertToArrayAndAddType(this.#excelFileManager.fileHashMap, 'X'),
            ...convertToArrayAndAddType(this.#excelFileManager.mockHashMap, 'M'),
        ];
        if (this.#includeFileManager) {
            allFiles.push(...convertToArrayAndAddType(this.#includeFileManager.fileHashMap, 'I'));
        }

        const meta = allFiles.map(([src_file, sha1, type]) => ({ src_file, sha1, type }));
        const sortedMeta = sortBy(meta, ['type', 'src_file']);

        return stringifyWithTabs(sortedMeta, ['type', 'src_file', 'sha1'], {
            eolChar: this.#eol,
            upperCaseColumns: true,
        });
    }
}
