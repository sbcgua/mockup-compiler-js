import { mkdirSync, rmSync } from 'node:fs';
import type { PackageInfo } from '../src/types';

export const buildDir = '_build';
export const bundlePath = `${buildDir}/bundle.js`;

export const binaryTargets = [
    {
        target: 'bun-linux-x64',
        outfile: `${buildDir}/mockup-compiler-linux-x64`,
    },
    {
        target: 'bun-windows-x64',
        outfile: `${buildDir}/mockup-compiler-windows-x64.exe`,
    },
] as const;

export async function readRootPackageInfo(): Promise<PackageInfo & { description?: string; license?: string }> {
    return JSON.parse(await Bun.file('package.json').text()) as PackageInfo & { description?: string; license?: string };
}

export function prepareBuildDir(): void {
    rmSync(buildDir, { recursive: true, force: true });
    mkdirSync(buildDir, { recursive: true });
}
