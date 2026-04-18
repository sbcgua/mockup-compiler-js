import { afterEach, describe, expect, mock, test, vi } from 'bun:test';

const mockFs = {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
};

afterEach(() => {
    vi.clearAllMocks();
    mock.restore();
});

async function loadValidator() {
    mock.module('node:fs', () => ({ default: mockFs, ...mockFs }));
    return import('./validator.ts');
}

describe('validateBundleFile', () => {
    test('should accept a valid text bundle', async () => {
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue([
            '!!MOCKUP-LOADER-FORMAT 1.0',
            '',
            '!!FILE /test/file1.txt text 2',
            'COL1\tCOL2',
            'A\tB',
            '',
            '!!FILE /test/file2.txt text 1',
            'VALUE',
            '',
            '!!FILE-COUNT 2',
        ].join('\n'));

        const { validateBundleFile } = await loadValidator();

        expect(validateBundleFile('/bundle.txt')).toBeUndefined();
    });

    test('should throw on malformed file header', async () => {
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue([
            '!!MOCKUP-LOADER-FORMAT 1.0',
            '',
            '!!FILE /test/file1.txt',
            'VALUE',
            '',
            '!!FILE-COUNT 1',
        ].join('\n'));

        const { validateBundleFile } = await loadValidator();

        expect(() => validateBundleFile('/bundle.txt')).toThrow('Malformed !!FILE tag at line 3');
    });

    test('should return warning text for trailing content after file count', async () => {
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue([
            '!!MOCKUP-LOADER-FORMAT 1.0',
            '',
            '!!FILE /test/file1.txt text 1',
            'VALUE',
            '',
            '!!FILE-COUNT 1',
            'TRAILING',
        ].join('\n'));

        const { validateBundleFile } = await loadValidator();

        expect(validateBundleFile('/bundle.txt')).toBe('Unexpected content after !!FILE-COUNT at line 7');
    });
});
