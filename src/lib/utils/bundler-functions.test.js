import { test, expect, vi, describe, beforeEach, afterEach } from 'vitest';
import { buildZipBundle, buildTextBundle, buildTextZipBundle } from './bundler-functions.js';
import { Readable, PassThrough } from 'node:stream';
import archiver from 'archiver';
import { TextBundler } from './mc-text-format.js';

// Mock dependencies
vi.mock('archiver');
vi.mock('./mc-text-format.js');
vi.mock('node:stream', () => ({
    Readable: vi.fn(),
    PassThrough: vi.fn()
}));

describe('bundler-functions', () => {
    let mockArchive;
    let mockTextBundler;
    let mockOutputStream;

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock archiver
        mockArchive = {
            on: vi.fn(),
            pipe: vi.fn(),
            append: vi.fn(),
            finalize: vi.fn().mockResolvedValue(undefined)
        };
        vi.mocked(archiver).mockReturnValue(mockArchive);

        // Mock TextBundler
        mockTextBundler = {
            append: vi.fn().mockResolvedValue(undefined),
            end: vi.fn()
        };
        vi.mocked(TextBundler).mockImplementation(() => mockTextBundler);

        // Mock output stream
        mockOutputStream = {
            write: vi.fn(),
            end: vi.fn(),
            destroy: vi.fn()
        };

        // Console spy to suppress/test console output
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
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

            expect(archiver).toHaveBeenCalledWith('zip', { zlib: { level: 9 } });
            expect(mockArchive.pipe).toHaveBeenCalledWith(mockOutputStream);
            expect(mockArchive.append).toHaveBeenCalledWith(mockReadStream, { name: 'test.txt' });
            expect(mockArchive.finalize).toHaveBeenCalled();
        });

        test('should handle empty generator', async () => {
            const itemGenerator = function* () {
                // Empty generator
            };

            await buildZipBundle(itemGenerator, mockOutputStream);

            expect(archiver).toHaveBeenCalledWith('zip', { zlib: { level: 9 } });
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

            expect(TextBundler).toHaveBeenCalledWith(mockOutputStream);
            expect(mockTextBundler.append).toHaveBeenCalledWith('test.txt', mockReadStream);
            expect(mockTextBundler.end).toHaveBeenCalled();
        });

        test('should handle empty generator', async () => {
            const itemGenerator = function* () {
                // Empty generator
            };

            await buildTextBundle(itemGenerator, mockOutputStream);

            expect(TextBundler).toHaveBeenCalledWith(mockOutputStream);
            expect(mockTextBundler.append).not.toHaveBeenCalled();
            expect(mockTextBundler.end).toHaveBeenCalled();
        });
    });

    describe('buildTextZipBundle', () => {
        test('should create PassThrough stream and call buildZipBundle', async () => {
            const itemGenerator = function* () {
                yield { name: 'test.txt', readStream: new Readable({ read() {} }) };
            };

            // Mock PassThrough constructor
            const mockPassThrough = {
                on: vi.fn((event, callback) => {
                    if (event === 'resume') {
                        setImmediate(callback);
                    } else if (event === 'end') {
                        setImmediate(callback);
                    }
                }),
                pipe: vi.fn(),
                resume: vi.fn(),
                write: vi.fn(),
                end: vi.fn(),
                emit: vi.fn()
            };

            vi.mocked(PassThrough).mockImplementation(() => mockPassThrough);

            // Mock archiver.append to simulate stream ending
            mockArchive.append.mockImplementation((stream) => {
                if (stream.on) {
                    setImmediate(() => stream.emit?.('end'));
                }
            });

            await buildTextZipBundle(itemGenerator, mockOutputStream);

            expect(archiver).toHaveBeenCalledWith('zip', { zlib: { level: 9 } });
            expect(mockArchive.append).toHaveBeenCalledWith(
                mockPassThrough,
                { name: 'bundle.txt' }
            );
        });
    });
});
