const argOptions = [
    ['-b, --no-color', 'suppress colors'],
    ['-q, --quiet', 'show no output'],
    ['-w, --watch', 'keep watching the files and re-render when changed'],
    ['-c, --config <path>', 'read config from this file'],
    ['-s, --source <path>', 'source directory'],
    ['-d, --destination <path>', 'destination uncompressed dir'],
    ['-n, --clean-dest', 'clean dest dir on startup'],
    ['-z, --zip <path>', 'path to zip file to build'],
    ['-i, --include <path>', 'path to include'],
    ['-e, --eol <eolchar>', 'end-of-line char: lf or crlf'],
    ['-m, --with-meta', 'calculate meta file (with source file hashes)'],
];

function argsToConfig(args) {
    if (args.eol && !/^(lf|crlf)$/i.test(args.eol)) {
        console.error('EOL must be "lf" or "crlf"');
        process.exit(1);
    }

    const config = {
        sourceDir: args.source,
        destDir:   args.destination,
        zipPath:   args.zip,
        includes:  args.include && [args.include],
        eol:       args.eol,
        quiet:     args.quiet,
        withMeta:  args.withMeta,
        cleanDestDirOnStart: args.cleanDest,
    };
    for (let k of Object.keys(config)) {
        if (!config[k]) delete config[k];
    }
    return config;
}

module.exports = {
    argOptions,
    argsToConfig,
};
