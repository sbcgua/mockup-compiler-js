import { describe, test, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import { readConfig, validateConfig } from './config.js';

vi.mock('node:fs');

describe('Config Module', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('readConfig', () => {
        const mockConfig = {
            sourceDir: '/mock/source',
            destDir: '/mock/dest',
        };

        test('should read and parse config file', () => {
            const configPath = '/mock/config.json';
            fs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));
            const config = readConfig(configPath);
            expect(config).toEqual({
                ...mockConfig,
                bundleFormat: 'zip',
                eol: 'lf',
                pattern: ['*.xlsx'],
            });
        });

        test('should merge overloads with config', () => {
            const configPath = '/mock/config.json';
            fs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));
            const overloads = { quiet: true };
            const config = readConfig(configPath, overloads);
            expect(config).toEqual({
                ...mockConfig,
                bundleFormat: 'zip',
                eol: 'lf',
                quiet: true,
                pattern: ['*.xlsx'],
            });
        });

        test('should throw error if config file cannot be read', () => {
            const configPath = '/mock/config.json';
            fs.readFileSync.mockImplementation(() => { throw new Error('File not found') });
            expect(() => readConfig(configPath)).toThrowError(/Could not read the config file:.*config\.json/);
        });
    });

    describe('validateConfig', () => {
        const mockCompleteConfig = {
            sourceDir: '/mock/source',
            destDir: '/mock/dest',
            eol: 'lf',
        };

        test('should validate correct config', () => {
            expect(() => validateConfig(mockCompleteConfig)).not.toThrow();
        });
        test('should validate with "commented" items', () => {
            expect(() => validateConfig({...mockCompleteConfig, '#comment': 'This is a comment' })).not.toThrow();
        });

        test('should throw error for missing required params', () => {
            const invalidConfig = { ...mockCompleteConfig };
            delete invalidConfig.sourceDir;
            expect(() => validateConfig(invalidConfig)).toThrowError('Config or params must have sourceDir');
        });

        test('should throw error for unexpected params', () => {
            const invalidConfig = { ...mockCompleteConfig, unexpectedParam: true };
            expect(() => validateConfig(invalidConfig)).toThrowError('Config validation error: unexpected param "unexpectedParam"');
        });

        test('should throw error for invalid param types', () => {
            const invalidConfig = { ...mockCompleteConfig, sourceDir: 123 };
            expect(() => validateConfig(invalidConfig)).toThrowError('Config validation error: sourceDir must be String');
        });

        test('should throw error for invalid eol value', () => {
            const invalidConfig = { ...mockCompleteConfig, eol: 'invalid' };
            expect(() => validateConfig(invalidConfig)).toThrowError('Config validation error: eol must be "lf" or "crlf"');
        });
    });
});