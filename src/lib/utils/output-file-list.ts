import type { BundleFileListSources } from '../types';

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
