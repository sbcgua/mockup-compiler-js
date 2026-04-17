import type { PackageInfo } from '../types';

export async function readBunPackageInfo(): Promise<PackageInfo> {
    return JSON.parse(await Bun.file(new URL('../../../package.json', import.meta.url)).text()) as PackageInfo;
}
