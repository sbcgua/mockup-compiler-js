import path from 'node:path';
import { sortBy } from 'lodash-es';
import { stringifyWithTabs } from './utils/tabbed.js';
import { slash } from './utils/fs-utils.js';

export default class MetaCalculator {
    #excelFileManager;
    #includeFileManager;
    #eol;
    #metaDir;
    #metaFilePath;
    #fs;

    constructor({excelFileManager, includeFileManager, eol, destDir, fs}) {
        this.#excelFileManager = excelFileManager;
        this.#includeFileManager = includeFileManager;
        this.#eol = eol;
        this.#fs = fs;

        if (!this.#fs.existsSync(destDir)) throw Error('Destination dir does not exist');
        this.#metaDir = path.join(destDir, this.metaDirName);
        this.#metaFilePath = path.join(destDir, this.metaSrcFileName);
    }
    get metaSrcFileName() { return '.meta/src_files' }
    get metaDirName() { return '.meta' }

    buildAndSave() {
        if (!this.#fs.existsSync(this.#metaDir)) this.#fs.mkdirSync(this.#metaDir);
        const metaData = this.#getSrcFilesMeta();
        this.#fs.writeFileSync(this.#metaFilePath, metaData);
    }

    #getSrcFilesMeta() {
        const convertToArrayAndAddType =
            (map, type) => [...map.entries()].map(([file, sha1]) => [slash(file), sha1, type]);

        const allFiles = convertToArrayAndAddType(this.#excelFileManager.fileHashMap, 'X');
        if (this.#includeFileManager) {
            allFiles.push(...convertToArrayAndAddType(this.#includeFileManager.fileHashMap, 'I'));
        }

        const meta = allFiles.map(([src_file, sha1, type]) => ({ src_file, sha1, type, timestamp: null }));
        const sortedMeta = sortBy(meta, ['type', 'src_file']);

        return stringifyWithTabs(sortedMeta, ['type', 'src_file', 'timestamp', 'sha1'], {
            eolChar: this.#eol,
            upperCaseColumns: true,
        });
    }
}
