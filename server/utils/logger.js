/**
 * Logger Utility
 * 
 * Provides a consistent logging interface using Winston
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Create a logger instance with a specific label
 * @param {string} label - Label for the logger (e.g., module name)
 * @returns {winston.Logger} - Configured logger instance
 */
exports.createLogger = (label) => {
  const logLevel = process.env.LOG_LEVEL || 'info';
  
  // Define log format
  const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.label({ label }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  );
  
  // Console format with colors
  const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, label, message, ...meta }) => {
      return `${timestamp} [${label}] ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
    })
  );
  
  // Create the logger
  const logger = winston.createLogger({
    level: logLevel,
    format: logFormat,
    defaultMeta: { service: 'mailsuite-api' },
    transports: [
      // Write all logs to console
      new winston.transports.Console({
        format: consoleFormat
      }),
      // Write all logs with level 'info' and below to combined.log
      new winston.transports.File({
        filename: path.join(logsDir, 'combined.log'),
        maxsize: 5242880, // 5MB
        maxFiles: 5
      }),
      // Write all logs with level 'error' and below to error.log
      new winston.transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5
      })
    ],
    // Handle uncaught exceptions and unhandled rejections
    exceptionHandlers: [
      new winston.transports.File({ 
        filename: path.join(logsDir, 'exceptions.log'),
        maxsize: 5242880, // 5MB
        maxFiles: 5
      })
    ],
    rejectionHandlers: [
      new winston.transports.File({ 
        filename: path.join(logsDir, 'rejections.log'),
        maxsize: 5242880, // 5MB
        maxFiles: 5
      })
    ]
  });
  
  // If we're not in production, also log to the console with pretty formatting
  if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
      format: consoleFormat
    }));
  }
  
  return logger;
};

// Create a default logger
const defaultLogger = exports.createLogger('default');

// Export the default logger
exports.logger = defaultLogger;
