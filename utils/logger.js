/**
 * Logging utility
 * Author: RL
 * 
 * Simple logging utility with different log levels and timestamp formatting
 */

/**
 * Log levels enum
 */
const LogLevel = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
};

/**
 * Current log level (can be set via environment variable)
 */
const currentLogLevel = process.env.LOG_LEVEL 
    ? LogLevel[process.env.LOG_LEVEL.toUpperCase()] || LogLevel.INFO
    : LogLevel.INFO;

/**
 * Formats timestamp for log entries
 * @returns {string} Formatted timestamp
 */
function getTimestamp() {
    return new Date().toISOString();
}

/**
 * Formats log message with timestamp and level
 * @param {string} level - Log level name
 * @param {Array} args - Arguments to log
 * @returns {string} Formatted log message
 */
function formatLogMessage(level, args) {
    const timestamp = getTimestamp();
    const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    
    return `[${timestamp}] [${level}] ${message}`;
}

/**
 * Generic log function
 * @param {number} level - Log level number
 * @param {string} levelName - Log level name
 * @param {Array} args - Arguments to log
 */
function log(level, levelName, ...args) {
    if (level <= currentLogLevel) {
        const formattedMessage = formatLogMessage(levelName, args);
        
        // Use appropriate console method based on level
        switch (level) {
            case LogLevel.ERROR:
                console.error(formattedMessage);
                break;
            case LogLevel.WARN:
                console.warn(formattedMessage);
                break;
            case LogLevel.DEBUG:
                console.debug(formattedMessage);
                break;
            default:
                console.log(formattedMessage);
        }
    }
}

/**
 * Logger object with different log level methods
 */
const logger = {
    /**
     * Log error messages
     */
    error: (...args) => log(LogLevel.ERROR, 'ERROR', ...args),
    
    /**
     * Log warning messages
     */
    warn: (...args) => log(LogLevel.WARN, 'WARN', ...args),
    
    /**
     * Log info messages
     */
    info: (...args) => log(LogLevel.INFO, 'INFO', ...args),
    
    /**
     * Log debug messages
     */
    debug: (...args) => log(LogLevel.DEBUG, 'DEBUG', ...args),
    
    /**
     * Set log level programmatically
     * @param {string} level - Log level ('ERROR', 'WARN', 'INFO', 'DEBUG')
     */
    setLevel: (level) => {
        const newLevel = LogLevel[level.toUpperCase()];
        if (newLevel !== undefined) {
            currentLogLevel = newLevel;
            logger.info(`Log level set to: ${level.toUpperCase()}`);
        } else {
            logger.warn(`Invalid log level: ${level}. Valid levels: ERROR, WARN, INFO, DEBUG`);
        }
    },
    
    /**
     * Get current log level
     * @returns {string} Current log level name
     */
    getLevel: () => {
        return Object.keys(LogLevel).find(key => LogLevel[key] === currentLogLevel);
    }
};

module.exports = logger;
