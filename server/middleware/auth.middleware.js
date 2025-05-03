/**
 * Authentication Middleware
 * 
 * Verifies JWT tokens and attaches the user to the request object.
 */

const jwt = require('jsonwebtoken');
const { createLogger } = require('../utils/logger');
const User = require('../models/user.model');

const logger = createLogger('auth-middleware');

/**
 * Middleware to authenticate JWT tokens
 */
exports.authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required. No token provided.' 
      });
    }
    
    // Extract token
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required. Invalid token format.' 
      });
    }
    
    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Find user by ID
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: 'User not found or token is invalid.' 
        });
      }
      
      // Attach user to request object
      req.user = user;
      next();
    } catch (error) {
      logger.error('Token verification error:', error.message);
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          success: false, 
          message: 'Token has expired. Please log in again.' 
        });
      }
      
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token. Please log in again.' 
      });
    }
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error during authentication.' 
    });
  }
};

/**
 * Optional authentication middleware
 * Doesn't require authentication but attaches user to request if token is valid
 */
exports.optionalAuthMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    // If no token, continue without authentication
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }
    
    // Extract token
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return next();
    }
    
    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Find user by ID
      const user = await User.findById(decoded.id).select('-password');
      
      if (user) {
        // Attach user to request object
        req.user = user;
      }
      
      next();
    } catch (error) {
      // Continue without authentication if token is invalid
      logger.debug('Optional auth token invalid:', error.message);
      next();
    }
  } catch (error) {
    logger.error('Optional authentication middleware error:', error);
    next();
  }
};

/**
 * Role-based authorization middleware
 * @param {string[]} roles - Array of allowed roles
 */
exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required.' 
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: `Role '${req.user.role}' is not authorized to access this resource.` 
      });
    }
    
    next();
  };
};
