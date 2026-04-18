import fs from 'node:fs';

export function validateBundleFile(filename: string): string | undefined {
    if (!fs.existsSync(filename)) {
        throw new Error(`File not found: ${filename}`);
    }

    const lines = fs.readFileSync(filename, 'utf8').split(/\r?\n/);
    let i = 0;

    if (!lines[i].startsWith('!!MOCKUP-LOADER-FORMAT ')) {
        throw new Error('Missing or invalid !!MOCKUP-LOADER-FORMAT header');
    }
    const version = lines[i].split(' ')[1];
    if (version !== '1.0') {
        throw new Error(`Unsupported format version: ${version}`);
    }
    i++;

    while (i < lines.length && !lines[i].startsWith('!!FILE ') && !lines[i].startsWith('!!FILE-COUNT ')) {
        i++;
    }

    let fileCounter = 0;
    while (i < lines.length) {
        if (lines[i].startsWith('!!FILE-COUNT ')) break;
        if (!lines[i].startsWith('!!FILE ')) {
            throw new Error(`Expected !!FILE tag at line ${i + 1}`);
        }

        const fileTag = lines[i].split(' ');
        if (fileTag.length < 4) {
            throw new Error(`Malformed !!FILE tag at line ${i + 1}`);
        }

        const relFilename = fileTag[1];
        const type = fileTag[2];
        const nLines = Number.parseInt(fileTag[3], 10);

        if (type !== 'text') {
            throw new Error(`Unsupported file type '${type}' at line ${i + 1}`);
        }
        if (Number.isNaN(nLines) || nLines < 0) {
            throw new Error(`Invalid line count at line ${i + 1}`);
        }
        i++;

        let dataLines = 0;
        while (dataLines < nLines) {
            if (i >= lines.length) {
                throw new Error(`Unexpected end of file data for ${relFilename}`);
            }
            dataLines++;
            i++;
        }
        fileCounter++;

        while (lines[i] !== undefined && lines[i].trim() === '') i++;
    }

    if (!lines[i] || !lines[i].startsWith('!!FILE-COUNT ')) {
        throw new Error('Missing or invalid !!FILE-COUNT');
    }
    const fileCount = Number.parseInt(lines[i].split(' ')[1], 10);
    if (Number.isNaN(fileCount) || fileCount < 0) {
        throw new Error('Invalid file count');
    }
    if (fileCounter !== fileCount) {
        throw new Error(`FILE-COUNT (${fileCount}) does not match actual file blocks (${fileCounter})`);
    }
    i++;

    while (lines[i] !== undefined && lines[i].trim() === '') i++;
    if (i < lines.length) {
        return `Unexpected content after !!FILE-COUNT at line ${i + 1}`;
    }

    return undefined;
}
