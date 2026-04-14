import type { LoggerContract } from '../types';

export default class Logger implements LoggerContract {
    quiet: boolean;

    constructor({ quiet = false }: { quiet?: boolean }) {
        this.quiet = quiet;
    }

    log(...params: unknown[]): void {
        if (!this.quiet) console.log(...params);
    }

    error(...params: unknown[]): void {
        if (!this.quiet) console.error(...params);
    }
}
