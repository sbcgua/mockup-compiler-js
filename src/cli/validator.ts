#!/usr/bin/env node
import fs from 'node:fs';

function printHelp(): void {
    console.log('Usage: mockup-validator <filename>');
    console.log('Validates a mockup text bundle file according to the specification.');
}

function error(msg: string): never {
    console.error('ERROR:', msg);
    process.exit(1);
}

function validateBundleFile(filename: string): void {
    if (!fs.existsSync(filename)) error(`File not found: ${filename}`);
    const lines = fs.readFileSync(filename, 'utf8').split(/\r?\n/);
    let i = 0;

    if (!lines[i].startsWith('!!MOCKUP-LOADER-FORMAT ')) error('Missing or invalid !!MOCKUP-LOADER-FORMAT header');
    const version = lines[i].split(' ')[1];
    if (version !== '1.0') error(`Unsupported format version: ${version}`);
    i++;

    while (i < lines.length && !lines[i].startsWith('!!FILE ') && !lines[i].startsWith('!!FILE-COUNT ')) i++;

    let fileCounter = 0;
    while (i < lines.length) {
        if (lines[i].startsWith('!!FILE-COUNT ')) break;
        if (!lines[i].startsWith('!!FILE ')) error(`Expected !!FILE tag at line ${i + 1}`);

        const fileTag = lines[i].split(' ');
        if (fileTag.length < 4) error(`Malformed !!FILE tag at line ${i + 1}`);
        const relFilename = fileTag[1];
        const type = fileTag[2];
        const nLines = Number.parseInt(fileTag[3], 10);

        if (type !== 'text') error(`Unsupported file type '${type}' at line ${i + 1}`);
        if (Number.isNaN(nLines) || nLines < 0) error(`Invalid line count at line ${i + 1}`);
        i++;

        let dataLines = 0;
        while (dataLines < nLines) {
            if (i >= lines.length) error(`Unexpected end of file data for ${relFilename}`);
            dataLines++;
            i++;
        }
        fileCounter++;

        while (lines[i] !== undefined && lines[i].trim() === '') i++;
    }

    if (!lines[i] || !lines[i].startsWith('!!FILE-COUNT ')) error('Missing or invalid !!FILE-COUNT');
    const fileCount = Number.parseInt(lines[i].split(' ')[1], 10);
    if (Number.isNaN(fileCount) || fileCount < 0) error('Invalid file count');
    if (fileCounter !== fileCount) error(`FILE-COUNT (${fileCount}) does not match actual file blocks (${fileCounter})`);
    i++;

    while (lines[i] !== undefined && lines[i].trim() === '') i++;
    if (i < lines.length) console.log(`WARNING: Unexpected content after !!FILE-COUNT at line ${i + 1}`);

    console.log('Validation successful. File is a valid mockup text bundle.');
}

const args = process.argv.slice(2);
if (args.length !== 1 || args[0] === '-h' || args[0] === '--help') {
    printHelp();
    process.exit(args.length === 1 ? 0 : 1);
}
validateBundleFile(args[0]);
