// @ts-nocheck
import { test, expect, mock, vi, describe, beforeEach, afterEach } from 'bun:test';
import { Readable } from 'node:stream';

const archiverMock = vi.fn();

mock.module('archiver', () => ({ default: archiverMock }));

const { buildZipBundle, buildTextBundle, buildTextZipBundle } = await import('./bundler-functions.ts');

describe('bundler-functions', () => {
    let mockArchive;
    let mockOutputStream;
    let outputText;

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock archiver
        mockArchive = {
            on: vi.fn(),
            pipe: vi.fn(),
            append: vi.fn(),
            finalize: vi.fn().mockResolvedValue(undefined)
        };
        archiverMock.mockReturnValue(mockArchive);

        // Mock output stream
        mockOutputStream = {
            write: vi.fn((chunk) => {
                outputText += chunk;
            }),
            end: vi.fn(),
            destroy: vi.fn()
        };
        outputText = '';

        // Console spy to suppress/test console output
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
        mock.restore();
    });

    describe('buildZipBundle', () => {
        test('should create zip archive and process items', async () => {
            const mockReadStream = {
                on: vi.fn((event, callback) => {
                    if (event === 'end') {
                        // Simulate stream ending immediately
                        setImmediate(callback);
                    }
                }),
                pipe: vi.fn(),
                resume: vi.fn()
            };

            const itemGenerator = function* () {
                yield { name: 'test.txt', readStream: mockReadStream };
            };

            await buildZipBundle(itemGenerator, mockOutputStream);

            expect(archiverMock).toHaveBeenCalledWith('zip', { zlib: { level: 9 } });
            expect(mockArchive.pipe).toHaveBeenCalledWith(mockOutputStream);
            expect(mockArchive.append).toHaveBeenCalledWith(mockReadStream, { name: 'test.txt' });
            expect(mockArchive.finalize).toHaveBeenCalled();
        });

        test('should handle empty generator', async () => {
            const itemGenerator = function* () {
                // Empty generator
            };

            await buildZipBundle(itemGenerator, mockOutputStream);

            expect(archiverMock).toHaveBeenCalledWith('zip', { zlib: { level: 9 } });
            expect(mockArchive.append).not.toHaveBeenCalled();
            expect(mockArchive.finalize).toHaveBeenCalled();
        });
    });

    describe('buildTextBundle', () => {
        test('should create TextBundler and process items', async () => {
            const mockReadStream = new Readable({
                read() {
                    this.push('test content');
                    this.push(null);
                }
            });

            const itemGenerator = function* () {
                yield { name: 'test.txt', readStream: mockReadStream };
            };

            await buildTextBundle(itemGenerator, mockOutputStream);

            expect(mockOutputStream.end).toHaveBeenCalled();
            expect(outputText).toContain('!!FILE test.txt text 1');
            expect(outputText).toContain('test content');
        });

        test('should handle empty generator', async () => {
            const itemGenerator = function* () {
                // Empty generator
            };

            await buildTextBundle(itemGenerator, mockOutputStream);

            expect(mockOutputStream.end).toHaveBeenCalled();
            expect(outputText).toBe('\n!!FILE-COUNT 0');
        });
    });

    describe('buildTextZipBundle', () => {
        test('should create PassThrough stream and call buildZipBundle', async () => {
            const itemGenerator = function* () {
                yield { name: 'test.txt', readStream: new Readable({ read() {} }) };
            };

            // Mock archiver.append to simulate stream ending
            mockArchive.append.mockImplementation((stream) => {
                if (stream.on) {
                    setImmediate(() => stream.emit?.('end'));
                }
            });

            await buildTextZipBundle(itemGenerator, mockOutputStream);

            expect(archiverMock).toHaveBeenCalledWith('zip', { zlib: { level: 9 } });
            expect(mockArchive.append).toHaveBeenCalledWith(
                expect.anything(),
                { name: 'bundle.txt' }
            );
        });
    });
});
