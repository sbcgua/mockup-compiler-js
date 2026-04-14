import type { CliArgs, ConfigOverloads } from './types';

export const argOptions: Array<[string, string]> = [
    ['-b, --no-color', 'suppress colors'],
    ['-q, --quiet', 'show no output'],
    ['-w, --watch', 'keep watching the files and re-render when changed'],
    ['-c, --config <path>', 'read config from this file'],
    ['-s, --source <path>', 'source directory'],
    ['-d, --destination <path>', 'destination uncompressed dir'],
    ['-n, --clean-dest', 'clean dest dir on startup'],
    ['-z, --bundle-path <path>', 'path to zip/txt file to build'],
    ['-Z, --no-bundle', 'suppress zip/txt file (which may be enabled in config)'],
    ['-i, --include <path>', 'path to include'],
    ['-e, --eol <eolchar>', 'end-of-line char: lf or crlf'],
    ['-m, --with-meta', 'calculate meta file (with source file hashes)'],
    ['-v, --verbose', 'verbose errors'],
    ['--in-mem', 'write mocks in memory and emit only the bundle output'],
    ['--bundle-format <format>', 'bundle format: text or zip (default) or text+zip'],
];

export function argsToConfig(args: CliArgs): ConfigOverloads {
    if (args.eol && !/^(lf|crlf)$/i.test(args.eol)) {
        console.error('EOL must be "lf" or "crlf"');
        process.exit(1);
    }

    const config: ConfigOverloads = {
        sourceDir: args.source,
        destDir: args.destination,
        bundlePath: args.bundlePath,
        noBundle: args.bundle === false,
        includes: args.include ? [args.include] : undefined,
        inMemory: args.inMem,
        eol: args.eol,
        quiet: args.quiet,
        withMeta: args.withMeta,
        cleanDestDirOnStart: args.cleanDest,
        bundleFormat: args.bundleFormat,
        verbose: args.verbose,
    };

    for (const key of Object.keys(config) as Array<keyof ConfigOverloads>) {
        if (config[key] === undefined) delete config[key];
    }
    return config;
}
