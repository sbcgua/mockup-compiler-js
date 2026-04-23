import { existsSync, readFileSync } from 'node:fs';
import { binaryTargets, bundlePath, readRootPackageInfo } from './build-config.ts';
import { buildBundle } from './build-bundle.ts';

function resolveTargets() {
    if (!existsSync('build-only')) return binaryTargets;
    const allowed = new Set(readFileSync('build-only', 'utf8').split(/\r?\n/).map(l => l.trim()).filter(Boolean));
    return binaryTargets.filter(t => allowed.has(t.target));
}

async function buildExecutables(): Promise<void> {
    if (!existsSync(bundlePath)) {
        await buildBundle();
    }

    const packageInfo = await readRootPackageInfo();
    const buildTargets = resolveTargets();

    for (const targetConfig of buildTargets) {
        const result = await Bun.build({
            entrypoints: [`./${bundlePath}`],
            compile: {
                target: targetConfig.target,
                outfile: targetConfig.outfile,
                windows: targetConfig.target.startsWith('bun-windows')
                    ? {
                        icon: 'docs/images/mc-icon.ico',
                        title: 'Mockup Compiler',
                        publisher: 'Alexander Tsybulsky',
                        version: packageInfo.version,
                        description: packageInfo.description,
                        copyright: packageInfo.license,
                    }
                    : undefined,
            },
            target: 'bun',
            format: 'esm',
            sourcemap: 'none',
            minify: true,
        });

        if (!result.success) {
            for (const log of result.logs) {
                console.error(log);
            }
            throw new Error(`Bun executable build failed for ${targetConfig.target}`);
        }

        console.log(`Executable ready: ${targetConfig.outfile}`);
    }
}

if (import.meta.main) {
    await buildExecutables();
}
