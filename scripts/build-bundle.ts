import { buildDir, prepareBuildDir, readRootPackageInfo } from './build-config.ts';

export async function buildBundle(): Promise<void> {
    const packageInfo = await readRootPackageInfo();

    prepareBuildDir();

    const result = await Bun.build({
        entrypoints: ['src/index.ts'],
        outdir: buildDir,
        naming: 'bundle.js',
        target: 'bun',
        format: 'esm',
        sourcemap: 'none',
        define: {
            __BUNDLED_PACKAGE_INFO__: JSON.stringify(JSON.stringify(packageInfo)),
        },
    });

    if (!result.success) {
        for (const log of result.logs) {
            console.error(log);
        }
        throw new Error('Bun bundle build failed');
    }

    console.log(`Bundle ready: ${buildDir}/bundle.js`);
}

if (import.meta.main) {
    await buildBundle();
}
