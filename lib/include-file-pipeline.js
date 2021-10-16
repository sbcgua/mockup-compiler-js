const fs = require('fs');
const path = require('path');
const assert = require('assert');
const crypto = require('crypto');

class IncludeFilePipeline {
    constructor({destRoot, withHashing}) {
        assert(typeof destRoot === 'string');
        this.destRoot = destRoot;
        this.withHashing = withHashing;
    }

    async processDir(includeDir) {
        return {
            includedFiles: [],
            includedFileHashes: [],
            includeDirs: [],
        };
    }
}

module.exports = IncludeFilePipeline;
