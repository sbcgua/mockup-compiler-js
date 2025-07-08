import archiver from 'archiver';

export async function zipFiles(itemGenerator, ostr) {
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('warning', (err) => { throw Object.assign(err, { _loc: 'zipFiles warning' }) });
    archive.on('error', (err) => { throw Object.assign(err, { _loc: 'zipFiles error' }) });
    archive.pipe(ostr);

    for (const { name, readStream } of itemGenerator()) {
        await new Promise((resolve, reject) => {
            readStream.on('end', resolve);
            readStream.on('error', reject);
            archive.append(readStream, { name });
        });
    }

    await archive.finalize();
}
