import EventEmitter from 'node:events';
import type { FileManagerContract, HashValue } from '../types';

export class FileManagerBase extends EventEmitter implements FileManagerContract {
    get fileHashMap(): Map<string, HashValue> | null { return null; }
    get mockHashMap(): Map<string, HashValue> | null { return null; }
    get testObjectList(): string[] | null { return null; }
    get srcDirs(): string[] | null { return null; }
    async processAll(): Promise<void> {}
    async processOneFile(_filepath: string): Promise<void> {}
}
