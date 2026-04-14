import path from 'node:path';
import fs from 'node:fs';
import { sortBy } from 'lodash-es';
import { stringifyWithTabs } from '../utils/tabbed.ts';
import { slash } from '../utils/fs-utils.ts';
import type { EolMode, FileManagerContract, MetaCalculatorContract, WritableFsLike } from '../types';

type MetaRow = {
    src_file: string;
    sha1: string | undefined;
    type: 'X' | 'M' | 'I';
};

type MetaCalculatorParams = {
    excelFileManager: FileManagerContract;
    includeFileManager?: FileManagerContract;
    eol: EolMode;
    destDir: string;
    memfs?: WritableFsLike;
};

export default class MetaCalculator implements MetaCalculatorContract {
    #excelFileManager: FileManagerContract;
    #includeFileManager?: FileManagerContract;
    #eol: EolMode;
    #metaDir: string;
    #metaFilePath: string;
    #destFs: WritableFsLike;

    constructor({ excelFileManager, includeFileManager, eol, destDir, memfs }: MetaCalculatorParams) {
        this.#excelFileManager = excelFileManager;
        this.#includeFileManager = includeFileManager;
        this.#eol = eol;
        this.#destFs = memfs || fs;

        if (!this.#destFs.existsSync(destDir)) throw Error('Destination dir does not exist');
        this.#metaDir = path.join(destDir, this.metaDirName);
        this.#metaFilePath = path.join(destDir, this.metaSrcFileName);
    }

    get metaSrcFileName(): string { return '.meta/src_files' }
    get metaDirName(): string { return '.meta' }

    buildAndSave(): Promise<void> {
        if (!this.#destFs.existsSync(this.#metaDir)) this.#destFs.mkdirSync(this.#metaDir);
        const metaData = this.#getSrcFilesMeta();
        return new Promise((resolve, reject) => {
            const stream = this.#destFs.createWriteStream(this.#metaFilePath, { encoding: 'utf8' });
            stream.on('finish', () => resolve());
            stream.on('error', reject);
            stream.write(metaData);
            stream.end();
        });
    }

    #getSrcFilesMeta(): string {
        const convertToArrayAndAddType = (
            map: Map<string, string | undefined> | null,
            type: MetaRow['type']
        ): [string, string | undefined, MetaRow['type']][] => [...(map?.entries() ?? [])]
            .map(([file, sha1]) => [slash(file), sha1, type]);

        const allFiles: [string, string | undefined, MetaRow['type']][] = [
            ...convertToArrayAndAddType(this.#excelFileManager.fileHashMap, 'X'),
            ...convertToArrayAndAddType(this.#excelFileManager.mockHashMap, 'M'),
        ];
        if (this.#includeFileManager) {
            allFiles.push(...convertToArrayAndAddType(this.#includeFileManager.fileHashMap, 'I'));
        }

        const meta = allFiles.map(([src_file, sha1, type]) => ({ src_file, sha1, type }));
        const sortedMeta = sortBy(meta, ['type', 'src_file']) as MetaRow[];

        return stringifyWithTabs(sortedMeta, ['type', 'src_file', 'sha1'], {
            eolChar: this.#eol,
            upperCaseColumns: true,
        });
    }
}
