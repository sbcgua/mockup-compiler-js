import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

export function copyDir(src: string, dest: string): string[] {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest);
    const filesInDir = fs.readdirSync(src);
    const addedFiles: string[] = [];

    for (const fileName of filesInDir) {
        const srcPath = path.join(src, fileName);
        const dstPath = path.join(dest, fileName.toLowerCase());
        const attrs = fs.lstatSync(srcPath);

        if (attrs.isDirectory()) {
            const addedSubdirFiles = copyDir(srcPath, dstPath);
            addedFiles.push(...addedSubdirFiles);
        } else {
            fs.copyFileSync(srcPath, dstPath);
            addedFiles.push(dstPath);
        }
    }

    return addedFiles;
}

export function slash(p: string): string {
    return p.replace(/\\/g, '/');
}

export function findCommonPath(paths: string[]): string {
    if (paths.length === 0) return '';
    if (paths.length === 1) return paths[0];

    const sep = '/';
    const pathSegments = paths.map(item => item.split(sep));
    const shortestPathLen = Math.min(...pathSegments.map(segments => segments.length));

    let commonSegs = 0;
    for (let i = 0; i < shortestPathLen; i++) {
        const segValues = pathSegments.map(segments => segments[i]);
        const equal = segValues.slice(1).every(segment => segment === segValues[0]);
        if (equal) commonSegs++; else break;
    }

    return pathSegments[0].slice(0, commonSegs).join(sep);
}

export const writeFileAsync = promisify(fs.writeFile);
export const readFileAsync = promisify(fs.readFile);
