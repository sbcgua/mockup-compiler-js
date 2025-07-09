import { test, expect, vi, describe, beforeEach, afterEach } from 'vitest';
import { Bundler } from './bundler.js';
import { Readable } from 'node:stream';
import fs from 'node:fs';
import path from 'node:path';

// Mock fs and path modules
vi.mock('node:fs');
vi.mock('node:path');

describe('Bundler', () => {
    let mockWriteStream;
    let mockReadStream;
    let mockMemfs;
    let bundlerConfig;
    let mockFs;
    let mockPath;

    beforeEach(() => {
        // Reset all mocks
        vi.clearAllMocks();

        // Get mocked modules
        mockFs = vi.mocked(fs);
        mockPath = vi.mocked(path);

        // Setup mockPath to work correctly
        mockPath.join.mockImplementation((...args) => args.join('/'));

        // Mock write stream
        mockWriteStream = {
            on: vi.fn().mockReturnThis(),
            errored: false,
            bytesWritten: 1024
        };
        mockFs.createWriteStream.mockReturnValue(mockWriteStream);

        // Mock read stream
        mockReadStream = new Readable({
            read() {}
        });
        mockFs.createReadStream.mockReturnValue(mockReadStream);

        // Mock memfs
        mockMemfs = {
            createReadStream: vi.fn().mockReturnValue(mockReadStream)
        };

        // Default bundler config
        bundlerConfig = {
            sourceDir: '/source',
            bundlePath: '/bundle/output.bundle',
            memfs: null,
            bundleFn: vi.fn((itemGenerator) => {
                // Simulate what a real bundler function would do - iterate over the generator
                Array.from(itemGenerator());
            })
        };

        // Mock file system operations
        mockFs.existsSync.mockReturnValue(false);
        mockFs.rmSync.mockReturnValue(undefined);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('constructor', () => {
        test('should create bundler with correct properties', () => {
            const bundler = new Bundler(bundlerConfig);
            expect(bundler.bundlePath).toBe('/bundle/output.bundle');
        });

        test('should handle memfs parameter', () => {
            const configWithMemfs = { ...bundlerConfig, memfs: mockMemfs };
            const bundler = new Bundler(configWithMemfs);
            expect(bundler.bundlePath).toBe('/bundle/output.bundle');
        });
    });

    describe('bundle method', () => {
        test('should throw error for invalid file list - null', async () => {
            const bundler = new Bundler(bundlerConfig);
            await expect(bundler.bundle(null)).rejects.toThrow('Invalid file list provided for bundling');
        });

        test('should throw error for invalid file list - empty array', async () => {
            const bundler = new Bundler(bundlerConfig);
            await expect(bundler.bundle([])).rejects.toThrow('Invalid file list provided for bundling');
        });

        test('should throw error for invalid file list - not array', async () => {
            const bundler = new Bundler(bundlerConfig);
            await expect(bundler.bundle('not-an-array')).rejects.toThrow('Invalid file list provided for bundling');
        });

        test('should delete existing bundle file if it exists', async () => {
            mockFs.existsSync.mockReturnValue(true);
            const bundler = new Bundler(bundlerConfig);

            // Mock successful bundling - set up the stream events properly
            mockWriteStream.on.mockImplementation((event, callback) => {
                if (event === 'close') {
                    // Simulate async behavior
                    process.nextTick(() => callback());
                }
                return mockWriteStream;
            });

            await bundler.bundle(['file1.txt']);

            expect(mockFs.existsSync).toHaveBeenCalledWith('/bundle/output.bundle');
            expect(mockFs.rmSync).toHaveBeenCalledWith('/bundle/output.bundle');
        });

        test('should not delete bundle file if it does not exist', async () => {
            mockFs.existsSync.mockReturnValue(false);
            const bundler = new Bundler(bundlerConfig);

            // Mock successful bundling
            mockWriteStream.on.mockImplementation((event, callback) => {
                if (event === 'close') {
                    process.nextTick(() => callback());
                }
                return mockWriteStream;
            });

            await bundler.bundle(['file1.txt']);

            expect(mockFs.existsSync).toHaveBeenCalledWith('/bundle/output.bundle');
            expect(mockFs.rmSync).not.toHaveBeenCalled();
        });

        test('should sort file list for consistency', async () => {
            const bundler = new Bundler(bundlerConfig);
            const fileList = ['file3.txt', 'file1.txt', 'file2.txt'];

            // Mock successful bundling
            mockWriteStream.on.mockImplementation((event, callback) => {
                if (event === 'close') {
                    process.nextTick(() => callback());
                }
                return mockWriteStream;
            });

            await bundler.bundle(fileList);

            expect(bundlerConfig.bundleFn).toHaveBeenCalled();

            // Check that the generator function was called with sorted files
            const generatorArg = bundlerConfig.bundleFn.mock.calls[0][0];
            const items = Array.from(generatorArg());
            expect(items.map(item => item.name)).toEqual(['file1.txt', 'file2.txt', 'file3.txt']);
        });

        test('should create write stream with correct bundle path', async () => {
            const bundler = new Bundler(bundlerConfig);

            // Mock successful bundling
            mockWriteStream.on.mockImplementation((event, callback) => {
                if (event === 'close') {
                    process.nextTick(() => callback());
                }
                return mockWriteStream;
            });

            await bundler.bundle(['file1.txt']);

            expect(mockFs.createWriteStream).toHaveBeenCalledWith('/bundle/output.bundle');
        });

        test('should call bundler function with item generator and output stream', async () => {
            const bundler = new Bundler(bundlerConfig);

            // Mock successful bundling
            mockWriteStream.on.mockImplementation((event, callback) => {
                if (event === 'close') {
                    process.nextTick(() => callback());
                }
                return mockWriteStream;
            });

            await bundler.bundle(['file1.txt']);

            expect(bundlerConfig.bundleFn).toHaveBeenCalledWith(
                expect.any(Function),
                mockWriteStream
            );
        });

        test('should return bytes written on successful bundling', async () => {
            const bundler = new Bundler(bundlerConfig);
            mockWriteStream.bytesWritten = 2048;

            // Mock successful bundling
            mockWriteStream.on.mockImplementation((event, callback) => {
                if (event === 'close') {
                    process.nextTick(() => callback());
                }
                return mockWriteStream;
            });

            const result = await bundler.bundle(['file1.txt']);

            expect(result).toBe(2048);
        });

        test('should reject promise on write stream error', async () => {
            const bundler = new Bundler(bundlerConfig);
            const expectedError = new Error('Write stream error');

            mockWriteStream.on.mockImplementation((event, callback) => {
                if (event === 'error') {
                    process.nextTick(() => callback(expectedError));
                }
                return mockWriteStream;
            });

            await expect(bundler.bundle(['file1.txt'])).rejects.toThrow('Write stream error');
        });

        test('should reject promise on write stream close with error', async () => {
            const bundler = new Bundler(bundlerConfig);
            const expectedError = new Error('Write stream close error');
            mockWriteStream.errored = expectedError;

            mockWriteStream.on.mockImplementation((event, callback) => {
                if (event === 'close') {
                    process.nextTick(() => callback());
                }
                return mockWriteStream;
            });

            await expect(bundler.bundle(['file1.txt'])).rejects.toThrow('Write stream close error');
        });

        test('should use memfs for read streams when provided', async () => {
            const configWithMemfs = { ...bundlerConfig, memfs: mockMemfs };
            const bundler = new Bundler(configWithMemfs);

            // Mock successful bundling
            mockWriteStream.on.mockImplementation((event, callback) => {
                if (event === 'close') {
                    process.nextTick(() => callback());
                }
                return mockWriteStream;
            });

            await bundler.bundle(['file1.txt']);

            expect(mockMemfs.createReadStream).toHaveBeenCalledWith('/source/file1.txt');
            expect(mockFs.createReadStream).not.toHaveBeenCalled();
        });

        test('should use fs for read streams when memfs is not provided', async () => {
            const bundler = new Bundler(bundlerConfig);

            // Mock successful bundling
            mockWriteStream.on.mockImplementation((event, callback) => {
                if (event === 'close') {
                    process.nextTick(() => callback());
                }
                return mockWriteStream;
            });

            await bundler.bundle(['file1.txt']);

            expect(mockFs.createReadStream).toHaveBeenCalledWith('/source/file1.txt');
        });
    });

    describe('item generator', () => {
        test('should generate items with correct names and read streams', async () => {
            const bundler = new Bundler(bundlerConfig);

            // Mock successful bundling
            mockWriteStream.on.mockImplementation((event, callback) => {
                if (event === 'close') {
                    process.nextTick(() => callback());
                }
                return mockWriteStream;
            });

            const fileList = ['file1.txt', 'file2.txt'];
            await bundler.bundle(fileList);

            // Get the generator function that was passed to bundlerFn
            const generatorArg = bundlerConfig.bundleFn.mock.calls[0][0];
            const items = Array.from(generatorArg());

            expect(items).toHaveLength(2);
            expect(items[0].name).toBe('file1.txt');
            expect(items[0].readStream).toBe(mockReadStream);
            expect(items[1].name).toBe('file2.txt');
            expect(items[1].readStream).toBe(mockReadStream);
        });

        test('should join source directory with file names correctly', async () => {
            const bundler = new Bundler(bundlerConfig);

            // Mock successful bundling
            mockWriteStream.on.mockImplementation((event, callback) => {
                if (event === 'close') {
                    process.nextTick(() => callback());
                }
                return mockWriteStream;
            });

            await bundler.bundle(['file1.txt']);

            expect(mockPath.join).toHaveBeenCalledWith('/source', 'file1.txt');
        });
    });

    describe('bundlePath getter', () => {
        test('should return the bundle path', () => {
            const bundler = new Bundler(bundlerConfig);
            expect(bundler.bundlePath).toBe('/bundle/output.bundle');
        });
    });
});
