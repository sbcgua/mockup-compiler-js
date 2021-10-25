const { sortBy } = require('lodash');
const { stringifyWithTabs } = require('./utils/tabbed');

class MetaCalculator {
    #excelFileManager;
    #includeFileManager;
    #eolChar;
    constructor({excelFileManager, includeFileManager, eolChar}) {
        this.#excelFileManager = excelFileManager;
        this.#includeFileManager = includeFileManager;
        this.#eolChar = eolChar;
    }
    static get metaSrcFileName() { return '.meta/src_files' }
    static get metaDirName() { return '.meta' }

    getSrcFilesMeta() {
        const convertToArrayAndAddType = (map, type) => [...map.entries()].map(([file, sha1]) => [file, sha1, type]);

        const allFiles = convertToArrayAndAddType(this.#excelFileManager.fileHashMap, 'X');
        if (this.#includeFileManager) {
            allFiles.push(...convertToArrayAndAddType(this.#includeFileManager.fileHashMap, 'I'));
        }

        const meta = allFiles.map(([src_file, sha1, type]) => ({ src_file, sha1, type, timestamp: null }));
        const sortedMeta = sortBy(meta, ['type', 'src_file']);

        return stringifyWithTabs(sortedMeta, ['type', 'src_file', 'timestamp', 'sha1'], this.#eolChar);
    }
}

module.exports = MetaCalculator;
