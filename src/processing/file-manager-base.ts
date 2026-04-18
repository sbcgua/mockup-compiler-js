import EventEmitter from 'node:events';
import type { FileManagerContract, HashValue } from '../types/index';

export abstract class FileManagerBase extends EventEmitter implements FileManagerContract {
    abstract get fileHashMap(): Map<string, HashValue> | null;
    abstract get mockHashMap(): Map<string, HashValue> | null;
    abstract get testObjectList(): string[] | null;
    abstract get srcDirs(): string[] | null;
    abstract processAll(): Promise<void>;
    abstract processOneFile(filepath: string): Promise<void>;
}
