import { slash, findCommonPath } from './fs-utils';
import { test, expect, describe } from 'vitest';

describe('fs-utils', () => {

    test('should slash path', () => {
        expect(slash('/hello/world')).toBe('/hello/world');
        expect(slash('\\hello\\world')).toBe('/hello/world');
        expect(slash('hello\\world')).toBe('hello/world');
        expect(slash('c:\\hello\\world')).toBe('c:/hello/world');
    });

    test('should findCommonPath', () => {
        expect(findCommonPath([
            '/a/b/c',
            '/a/b/z',
        ])).toBe('/a/b');
        expect(findCommonPath([
            '/a/b/c/x',
            '/a/b/z',
        ])).toBe('/a/b');
        expect(findCommonPath([
            '/a/b/c/x',
            '/a/b/z',
            '/a/b/x/1',
            '/a',
        ])).toBe('/a');
        expect(findCommonPath([
            '/a/b/c',
            '/a/b/z/x',
        ])).toBe('/a/b');
        expect(findCommonPath([
            '/a/b/c/x',
            '/z/b/z',
        ])).toBe('');
        expect(findCommonPath([
            'c:/a/b/c/x',
            'd:/z/b/z',
        ])).toBe('');
        expect(findCommonPath([
            'c:/a/b/c/x',
            'c:/a/x/z',
        ])).toBe('c:/a');
    });

});