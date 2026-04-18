import type { BundleFileListSources } from '../types/index';

export function collectOutputFileList({
    excelFileManager,
    includeFileManager,
    metaCalculator,
}: BundleFileListSources): string[] {
    return [
        ...(excelFileManager.testObjectList ?? []),
        ...(includeFileManager?.testObjectList ?? []),
        ...(metaCalculator ? [metaCalculator.metaSrcFileName] : []),
    ];
}
