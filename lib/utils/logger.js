class Logger {
    constructor({ quiet }) {
        this.quiet = quiet;
    }
    log(...params) {
        if (!this.quiet) console.log(...params);
    }
    error(...params) {
        if (!this.quiet) console.error(...params);
    }
}

module.exports = Logger;
