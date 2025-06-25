import { test, expect, vi, describe } from 'vitest';
import Logger from './logger';

describe('Logger', () => {
    test('Logger should log messages when not quiet', () => {
        const logger = new Logger({ quiet: false });
        const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        logger.log('Hello, world!');
        expect(consoleLogSpy).toHaveBeenCalledWith('Hello, world!');

        consoleLogSpy.mockRestore();
    });

    test('Logger should not log messages when quiet', () => {
        const logger = new Logger({ quiet: true });
        const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        logger.log('Hello, world!');
        expect(consoleLogSpy).not.toHaveBeenCalled();

        consoleLogSpy.mockRestore();
    });

    test('Logger should log errors when not quiet', () => {
        const logger = new Logger({ quiet: false });
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        logger.error('An error occurred!');
        expect(consoleErrorSpy).toHaveBeenCalledWith('An error occurred!');

        consoleErrorSpy.mockRestore();
    });

    test('Logger should not log errors when quiet', () => {
        const logger = new Logger({ quiet: true });
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        logger.error('An error occurred!');
        expect(consoleErrorSpy).not.toHaveBeenCalled();

        consoleErrorSpy.mockRestore();
    });
});