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

    constructor({excelFileManager, includeFileManager, eol, destDir}) {
        this.#excelFileManager = excelFileManager;
        this.#includeFileManager = includeFileManager;
        this.#eol = eol;

        if (!fs.existsSync(destDir)) throw Error('Destination dir does not exist');
        this.#metaDir = path.join(destDir, this.metaDirName);
        this.#metaFilePath = path.join(destDir, this.metaSrcFileName);
    }
    get metaSrcFileName() { return '.meta/src_files' }
    get metaDirName() { return '.meta' }

    buildAndSave() {
        if (!fs.existsSync(this.#metaDir)) fs.mkdirSync(this.#metaDir);
        const metaData = this.#getSrcFilesMeta();
        fs.writeFileSync(this.#metaFilePath, metaData);
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
