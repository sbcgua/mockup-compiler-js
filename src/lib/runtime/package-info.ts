import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type { PackageInfo } from '../types';

type SeaModule = {
    getAsset(key: string, encoding: string): string;
    isSea(): boolean;
};

function loadSeaModule(): SeaModule | null {
    try {
        const require = createRequire(import.meta.url ?? process.cwd());
        return require('node:sea') as SeaModule;
    } catch {
        return null;
    }
}

function parsePackageInfo(blob: string | Buffer): PackageInfo {
    return JSON.parse(blob.toString()) as PackageInfo;
}

function readBundledPackageInfo(): PackageInfo | null {
    if (typeof __BUNDLED_PACKAGE_INFO__ !== 'string') return null;
    return parsePackageInfo(__BUNDLED_PACKAGE_INFO__);
}

function readDiskPackageInfo(): PackageInfo {
    const runtimeFileDir = path.dirname(fileURLToPath(import.meta.url));
    try {
        return parsePackageInfo(readFileSync(path.join(runtimeFileDir, '../../../package.json')));
    } catch {
        return parsePackageInfo(readFileSync(path.join(runtimeFileDir, '../../../../package.json')));
    }
}

export async function readPackageInfo(): Promise<PackageInfo> {
    const sea = loadSeaModule();
    if (sea?.isSea()) {
        return parsePackageInfo(sea.getAsset('package.json', 'utf-8'));
    }

    const bundled = readBundledPackageInfo();
    if (bundled) {
        return bundled;
    }

    if (process.versions.bun) {
        const { readBunPackageInfo } = await import('./package-info-bun.ts');
        return readBunPackageInfo();
    }

    return readDiskPackageInfo();
}
