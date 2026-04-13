import type EventEmitter from 'node:events';
import type { Readable, Writable } from 'node:stream';
import type { WorkBook, WorkSheet } from 'xlsx';

export type EolMode = 'lf' | 'crlf';
export type BundleFormat = 'zip' | 'text' | 'text+zip';
export type HashValue = string | undefined;

export interface LoggerContract {
    quiet?: boolean;
    log(...params: unknown[]): void;
    error(...params: unknown[]): void;
}

export interface CliArgs {
    color?: boolean;
    quiet?: boolean;
    watch?: boolean;
    config?: string;
    source?: string;
    destination?: string;
    cleanDest?: boolean;
    bundlePath?: string;
    bundle?: boolean;
    include?: string;
    eol?: string;
    withMeta?: boolean;
    verbose?: boolean;
    bundleFormat?: string;
}

export interface RawConfig {
    sourceDir?: string;
    destDir?: string;
    includes?: string[];
    zipPath?: string;
    bundlePath?: string;
    noBundle?: boolean;
    inMemory?: boolean;
    eol?: EolMode | string;
    bundleFormat?: BundleFormat | string;
    quiet?: boolean;
    verbose?: boolean;
    withMeta?: boolean;
    cleanDestDirOnStart?: boolean;
    skipFieldsStartingWith?: string;
    pattern?: string | string[];
    logger?: LoggerContract;
    [commentKey: `#${string}`]: unknown;
}

export type ConfigOverloads = Partial<RawConfig>;
export type ArgToConfigOverlay = ConfigOverloads;

export interface BaseValidatedConfig {
    sourceDir: string;
    includes?: string[];
    bundlePath?: string;
    noBundle?: boolean;
    eol: EolMode;
    bundleFormat: BundleFormat;
    quiet?: boolean;
    verbose?: boolean;
    withMeta?: boolean;
    cleanDestDirOnStart?: boolean;
    skipFieldsStartingWith?: string;
    pattern: string[];
    logger?: LoggerContract;
    [commentKey: `#${string}`]: unknown;
}

export interface DiskAppConfig extends BaseValidatedConfig {
    destDir: string;
    inMemory?: false | undefined;
}

export interface InMemoryAppConfig extends BaseValidatedConfig {
    inMemory: true;
    bundlePath: string;
    destDir?: undefined;
}

export type AppConfig = DiskAppConfig | InMemoryAppConfig;
export type ValidatedConfig = AppConfig;
export type AppRuntimeConfig = AppConfig & { logger: LoggerContract };

export type SheetCellValue = string | number | boolean | Date | null;

export interface MockRowMetadata {
    __isempty__?: true;
    __rowNum__?: number;
    __sheetName__?: string;
}

export type MockRow = Record<string, SheetCellValue | true | number | undefined> & MockRowMetadata;

export interface MockTableMetadata {
    __columns__: string[];
    __sheetName__?: string;
}

export type MockTable = Array<MockRow> & MockTableMetadata;

export type WorkbookMocks = Record<string, MockTable>;

export interface WorksheetWithMetadata extends WorkSheet {
    __sheetName__?: string;
}

export interface WorkbookLike extends WorkBook {
    Sheets: Record<string, WorksheetWithMetadata>;
}

export interface MockProcessorResult {
    data: string;
    rowCount: number;
}

export type MockExtractor = (workbook: WorkbookLike) => WorkbookMocks;
export type MockProcessor = (rows: MockTable) => MockProcessorResult;

export interface FileProcessingStartedEvent {
    name: string;
}

export interface FileManagerProcessedItemEvent {
    name: string;
    rowCount?: number;
}

export interface FileManagerContract extends EventEmitter {
    readonly fileHashMap: Map<string, HashValue> | null;
    readonly mockHashMap: Map<string, HashValue> | null;
    readonly testObjectList: string[] | null;
    readonly srcDirs: string[] | null;
    processAll(): Promise<void>;
    processOneFile(filepath: string): Promise<void>;
    isFileRelevant?(filepath: string): boolean;
    on(event: 'start-of-file-processing', listener: (payload: FileProcessingStartedEvent) => void): this;
    on(event: 'item-processed', listener: (payload: FileManagerProcessedItemEvent) => void): this;
}

export interface BundleItem {
    name: string;
    readStream: Readable;
}

export interface ReadableFsLike {
    createReadStream(path: string): Readable;
}

export interface WritableFsLike {
    existsSync(path: string): boolean;
    mkdirSync(path: string, options?: unknown): unknown;
    createWriteStream(path: string, options?: unknown): Writable;
}

export type BundleItemGenerator = () => Generator<BundleItem, void, void>;

export interface BundleOutputStream extends Writable {
    bytesWritten?: number;
    errored?: Error | null;
}

export type BundlerFunction = (itemGenerator: BundleItemGenerator, ostr: BundleOutputStream) => Promise<void> | void;

export interface BundlerContract {
    readonly bundlePath: string;
    bundle(fileList: string[]): Promise<number>;
}

export interface MetaCalculatorContract {
    readonly metaSrcFileName: string;
    buildAndSave(): Promise<void>;
}
