/**
 * User Controller
 * 
 * Handles user profile and settings management
 */

const User = require('../models/user.model');
const Tracking = require('../models/tracking.model');
const Template = require('../models/template.model');
const { asyncHandler } = require('../middleware/error.middleware');
const { ApiError } = require('../middleware/error.middleware');
const { createLogger } = require('../utils/logger');

const logger = createLogger('user-controller');

/**
 * Get user profile
 * @route GET /api/users/profile
 * @access Private
 */
exports.getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  
  if (!user) {
    throw new ApiError('User not found', 404);
  }
  
  res.status(200).json({
    success: true,
    data: user
  });
});

/**
 * Update user profile
 * @route PUT /api/users/profile
 * @access Private
 */
exports.updateUserProfile = asyncHandler(async (req, res) => {
  // Fields that can be updated
  const allowedFields = ['name', 'profilePicture'];
  
  // Filter out fields that are not allowed to be updated
  const updatedFields = {};
  Object.keys(req.body).forEach(key => {
    if (allowedFields.includes(key)) {
      updatedFields[key] = req.body[key];
    }
  });
  
  // Update user profile
  const user = await User.findByIdAndUpdate(
    req.user.id,
    updatedFields,
    { new: true, runValidators: true }
  );
  
  if (!user) {
    throw new ApiError('User not found', 404);
  }
  
  res.status(200).json({
    success: true,
    data: user,
    message: 'Profile updated successfully'
  });
});

/**
 * Get user settings
 * @route GET /api/users/settings
 * @access Private
 */
exports.getUserSettings = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  
  if (!user) {
    throw new ApiError('User not found', 404);
  }
  
  res.status(200).json({
    success: true,
    data: user.settings
  });
});

/**
 * Update user settings
 * @route PUT /api/users/settings
 * @access Private
 */
exports.updateUserSettings = asyncHandler(async (req, res) => {
  // Update user settings
  const user = await User.findById(req.user.id);
  
  if (!user) {
    throw new ApiError('User not found', 404);
  }
  
  // Update settings
  user.settings = {
    ...user.settings,
    ...req.body
  };
  
  // Validate settings
  if (user.settings.followUpDays < 1 || user.settings.followUpDays > 30) {
    throw new ApiError('Follow-up days must be between 1 and 30', 400);
  }
  
  if (user.settings.dataRetentionDays < 1) {
    throw new ApiError('Data retention days must be at least 1', 400);
  }
  
  // Save updated user
  await user.save();
  
  // If data retention days changed, update expiration dates on tracking records
  if (req.body.dataRetentionDays) {
    // Update all tracking records for this user
    const trackingRecords = await Tracking.find({ userId: req.user.id });
    
    const updatePromises = trackingRecords.map(record => {
      return record.updateExpiration(req.body.dataRetentionDays);
    });
    
    await Promise.all(updatePromises);
  }
  
  res.status(200).json({
    success: true,
    data: user.settings,
    message: 'Settings updated successfully'
  });
});

/**
 * Delete user account
 * @route DELETE /api/users/account
 * @access Private
 */
exports.deleteAccount = asyncHandler(async (req, res) => {
  // Get user
  const user = await User.findById(req.user.id);
  
  if (!user) {
    throw new ApiError('User not found', 404);
  }
  
  // Start a transaction to delete all user data
  const session = await User.startSession();
  session.startTransaction();
  
  try {
    // Delete all tracking records
    await Tracking.deleteMany({ userId: req.user.id }, { session });
    
    // Delete all templates
    await Template.deleteMany({ userId: req.user.id }, { session });
    
    // Delete user
    await User.findByIdAndDelete(req.user.id, { session });
    
    // Commit transaction
    await session.commitTransaction();
    session.endSession();
    
    logger.info(`User account deleted: ${req.user.id}`);
    
    res.status(200).json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    // Abort transaction on error
    await session.abortTransaction();
    session.endSession();
    
    logger.error(`Error deleting account: ${error.message}`, { userId: req.user.id });
    throw new ApiError('Error deleting account', 500);
  }
});
