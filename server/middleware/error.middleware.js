/**
 * Error Handling Middleware
 * 
 * Centralized error handling for the API
 */

const { createLogger } = require('../utils/logger');

const logger = createLogger('error-middleware');

/**
 * Custom API Error class
 */
class ApiError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Handle MongoDB duplicate key errors
 */
const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  const message = `Duplicate field value: ${value}. Please use another value for ${field}.`;
  return new ApiError(message, 400);
};

/**
 * Handle Mongoose validation errors
 */
const handleValidationError = (err) => {
  const errors = Object.values(err.errors).map(val => val.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new ApiError(message, 400);
};

/**
 * Handle JWT errors
 */
const handleJWTError = () => {
  return new ApiError('Invalid token. Please log in again.', 401);
};

/**
 * Handle JWT expired error
 */
const handleJWTExpiredError = () => {
  return new ApiError('Your token has expired. Please log in again.', 401);
};

/**
 * Handle development errors with detailed information
 */
const sendErrorDev = (err, res) => {
  logger.error('Development Error:', { 
    message: err.message,
    stack: err.stack,
    statusCode: err.statusCode
  });
  
  res.status(err.statusCode).json({
    success: false,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

/**
 * Handle production errors with limited information
 */
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    logger.error('Operational Error:', { 
      message: err.message,
      statusCode: err.statusCode
    });
    
    return res.status(err.statusCode).json({
      success: false,
      message: err.message
    });
  }
  
  // Programming or other unknown error: don't leak error details
  logger.error('Unknown Error:', { 
    message: err.message,
    stack: err.stack
  });
  
  // Send generic message
  return res.status(500).json({
    success: false,
    message: 'Something went wrong'
  });
};

/**
 * Global error handling middleware
 */
exports.errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;
    error.stack = err.stack;
    
    // Handle specific error types
    if (err.code === 11000) error = handleDuplicateKeyError(err);
    if (err.name === 'ValidationError') error = handleValidationError(err);
    if (err.name === 'JsonWebTokenError') error = handleJWTError();
    if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();
    
    sendErrorProd(error, res);
  }
};

/**
 * Async handler to avoid try-catch blocks in route handlers
 */
exports.asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Not found handler for undefined routes
 */
exports.notFoundHandler = (req, res, next) => {
  const err = new ApiError(`Cannot find ${req.method} ${req.originalUrl} on this server`, 404);
  next(err);
};

// Export the ApiError class for use in controllers
exports.ApiError = ApiError;
