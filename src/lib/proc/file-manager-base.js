import EventEmitter from 'node:events';

export class FileManagerBase extends EventEmitter {
    // constructor({destDir, withHashing, srcDir});
    get fileHashMap() { return null }
    get mockHashMap() { return null } // TODO unify somehow ?
    get testObjectList() { return null }
    get srcDirs() { return null }
    async processAll() {};
    async processOneFile(filepath) {}; // eslint-disable-line no-unused-vars
    // event 'item-processed'
}
