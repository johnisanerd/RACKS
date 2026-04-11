/**
 * Simple logger for CLI and backend services
 */
export function createLogger(name) {
    const prefix = `[${name}]`;
    return {
        info: (message, meta) => {
            console.log(`${prefix} ${message}`, meta ? JSON.stringify(meta) : '');
        },
        warn: (message, meta) => {
            console.warn(`${prefix} ⚠️  ${message}`, meta ? JSON.stringify(meta) : '');
        },
        error: (message, meta) => {
            console.error(`${prefix} ❌ ${message}`, meta ? JSON.stringify(meta) : '');
        },
        debug: (message, meta) => {
            if (process.env.DEBUG) {
                console.debug(`${prefix} 🔍 ${message}`, meta ? JSON.stringify(meta) : '');
            }
        }
    };
}
//# sourceMappingURL=logger.js.map