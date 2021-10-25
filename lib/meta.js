const { sortBy } = require('lodash');
const { stringifyWithTabs } = require('./utils/tabbed');

class MetaCalculator {
    #excelFileManager;
    #includeFileManager;
    #eol;
    constructor({excelFileManager, includeFileManager, eol}) {
        this.#excelFileManager = excelFileManager;
        this.#includeFileManager = includeFileManager;
        this.#eol = eol;
    }
    get metaSrcFileName() { return '.meta/src_files' }
    get metaDirName() { return '.meta' }

    getSrcFilesMeta() {
        const convertToArrayAndAddType = (map, type) => [...map.entries()].map(([file, sha1]) => [file, sha1, type]);

        const allFiles = convertToArrayAndAddType(this.#excelFileManager.fileHashMap, 'X');
        if (this.#includeFileManager) {
            allFiles.push(...convertToArrayAndAddType(this.#includeFileManager.fileHashMap, 'I'));
        }

        const meta = allFiles.map(([src_file, sha1, type]) => ({ src_file, sha1, type, timestamp: null }));
        const sortedMeta = sortBy(meta, ['type', 'src_file']);

        return stringifyWithTabs(sortedMeta, ['type', 'src_file', 'timestamp', 'sha1'], this.#eol);
    }
}

module.exports = MetaCalculator;
