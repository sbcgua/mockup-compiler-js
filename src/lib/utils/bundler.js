import fs from 'node:fs';

export class Bundler {
    #sourceDir;
    #bundlePath;
    #bundlerFn;
    constructor({sourceDir, bundlePath, bundlerFn}) {
        this.#sourceDir  = sourceDir;
        this.#bundlePath = bundlePath;
        this.#bundlerFn  = bundlerFn;
    }
    #deleteBundleFile() {
        if (fs.existsSync(this.#bundlePath)) fs.rmSync(this.#bundlePath);
    }
    async bundle(files) {
        this.#deleteBundleFile();
        return await this.#bundlerFn(this.#sourceDir, files, this.#bundlePath);
    }
    get bundlePath() { return this.#bundlePath }
}

/**
 * Idea for a better bundler, that is based on streams.
 * BundleManager( bundlePath, bundler )
 *   createWriteStream( bundlePath )
 *   bundler.getStream.pipe( writeStream )
 *   bundle(sourceDir, files): (or maybe later switch to streamOnly approach, so that mocks are generated as streams one-by-one)
 *     sort filenames
 *     forEach:
 *       createReadStream(file)
 *       bundler.append(rs, { name: ... })
 *     bundler.end()
 *
 * ZIP:
 *   getStream => archiver
 *   append => archiver.append
 *   end => archiver.finalize
 *
 * TEXT:
 *   construct => add headers
 *   getStream => PassThrough
 *   append => buildText, write to PassThrough
 *   end => write tail, PassThrough.end
 *
 * TEXT+ZIP:
 *   same, but pipe PassThrough to archiver, name -> bundle.txt
 */