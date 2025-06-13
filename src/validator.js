#!/usr/bin/env node
// validator.js: Validate mockup text bundle format as per doc/text-bundle-format.md
import fs from 'fs';

function printHelp() {
    console.log('Usage: mockup-validator <filename>');
    console.log('Validates a mockup text bundle file according to the specification.');
}

function error(msg) {
    console.error('ERROR:', msg);
    process.exit(1);
}

function validateBundleFile(filename) {
    if (!fs.existsSync(filename)) error(`File not found: ${filename}`);
    const lines = fs.readFileSync(filename, 'utf8').split(/\r?\n/);
    let i = 0;

    // 1. Header: !!MOCKUP-LOADER-FORMAT <VERSION>
    if (!lines[i].startsWith('!!MOCKUP-LOADER-FORMAT ')) error('Missing or invalid !!MOCKUP-LOADER-FORMAT header');
    const version = lines[i].split(' ')[1];
    if (version !== '1.0') error('Unsupported format version: ' + version);
    i++;

    // 2. !!FILE-COUNT <N>
    if (!lines[i] || !lines[i].startsWith('!!FILE-COUNT ')) error('Missing or invalid !!FILE-COUNT header');
    const fileCount = parseInt(lines[i].split(' ')[1], 10);
    if (isNaN(fileCount) || fileCount < 0) error('Invalid file count');
    i++;
    // while (lines[i] && lines[i].trim() === '') i++; // skip blank lines

    // 3. Optional metadata/comments until first !!FILE
    while (lines[i] !== undefined && !lines[i].startsWith('!!FILE ')) i++;

    // 4. Validate FILES
    let fileCounter = 0;
    while (i < lines.length) {
        if (!lines[i].startsWith('!!FILE ')) error(`Expected !!FILE tag at line ${i+1}`);
        // !!FILE <FILENAME> <TYPE> <LINES>
        const fileTag = lines[i].split(' ');
        if (fileTag.length < 4) error(`Malformed !!FILE tag at line ${i+1}`);
        const relFilename = fileTag[1];
        const type = fileTag[2];
        const nLines = parseInt(fileTag[3], 10);
        // if (!relFilename.startsWith('/')) error(`Filename should start with / at line ${i+1}`);
        if (type !== 'text') error(`Unsupported file type '${type}' at line ${i+1}`);
        if (isNaN(nLines) || nLines < 0) error(`Invalid line count at line ${i+1}`);
        i++;
        // Read nLines of file data
        let dataLines = 0;
        while (dataLines < nLines) {
            if (i >= lines.length) error(`Unexpected end of file data for ${relFilename}`);
            dataLines++;
            i++;
        }
        fileCounter++;
        // skip any blank lines after file data
        while (lines[i] !== undefined && lines[i].trim() === '') i++;
    }
    if (fileCounter !== fileCount) error(`FILE-COUNT (${fileCount}) does not match actual file blocks (${fileCounter})`);
    console.log('Validation successful. File is a valid mockup text bundle.');
}

const args = process.argv.slice(2);
if (args.length !== 1 || args[0] === '-h' || args[0] === '--help') {
    printHelp();
    process.exit(args.length === 1 ? 0 : 1);
}
validateBundleFile(args[0]);
