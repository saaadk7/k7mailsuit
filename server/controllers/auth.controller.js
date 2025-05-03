/**
 * Authentication Controller
 * 
 * Handles user registration, login, and authentication
 */

const crypto = require('crypto');
const User = require('../models/user.model');
const { asyncHandler } = require('../middleware/error.middleware');
const { ApiError } = require('../middleware/error.middleware');
const { createLogger } = require('../utils/logger');
const { sendWelcomeEmail, sendVerificationEmail, sendPasswordResetEmail } = require('../utils/email');

const logger = createLogger('auth-controller');

/**
 * Register a new user
 * @route POST /api/auth/register
 */
exports.register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  
  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError('Email already in use', 400);
  }
  
  // Create new user
  const user = await User.create({
    name,
    email,
    password
  });
  
  // Generate email verification token
  const verificationToken = user.getEmailVerificationToken();
  await user.save({ validateBeforeSave: false });
  
  try {
    // Send welcome and verification emails
    await sendWelcomeEmail(user);
    await sendVerificationEmail(user, verificationToken);
    
    // Create and send JWT token
    sendTokenResponse(user, 201, res, 'User registered successfully. Please verify your email.');
  } catch (error) {
    // Reset verification token if email sending fails
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save({ validateBeforeSave: false });
    
    logger.error('Email sending failed during registration:', error);
    throw new ApiError('Email could not be sent', 500);
  }
});

/**
 * Login user
 * @route POST /api/auth/login
 */
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  // Check if email and password are provided
  if (!email || !password) {
    throw new ApiError('Please provide email and password', 400);
  }
  
  // Find user by email and include password in the result
  const user = await User.findOne({ email }).select('+password');
  
  if (!user) {
    throw new ApiError('Invalid credentials', 401);
  }
  
  // Check if password matches
  const isMatch = await user.matchPassword(password);
  
  if (!isMatch) {
    throw new ApiError('Invalid credentials', 401);
  }
  
  // Update last login timestamp
  user.lastLogin = Date.now();
  await user.save({ validateBeforeSave: false });
  
  // Create and send JWT token
  sendTokenResponse(user, 200, res, 'Login successful');
});

/**
 * Logout user / clear cookie
 * @route GET /api/auth/logout
 */
exports.logout = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

/**
 * Get current logged in user
 * @route GET /api/auth/me
 */
exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  
  res.status(200).json({
    success: true,
    data: user
  });
});

/**
 * Update user details
 * @route PUT /api/auth/updatedetails
 */
exports.updateDetails = asyncHandler(async (req, res) => {
  const fieldsToUpdate = {
    name: req.body.name,
    email: req.body.email
  };
  
  // Remove undefined fields
  Object.keys(fieldsToUpdate).forEach(key => {
    if (fieldsToUpdate[key] === undefined) {
      delete fieldsToUpdate[key];
    }
  });
  
  // Check if email is being changed
  if (fieldsToUpdate.email && fieldsToUpdate.email !== req.user.email) {
    // Check if new email is already in use
    const existingUser = await User.findOne({ email: fieldsToUpdate.email });
    if (existingUser) {
      throw new ApiError('Email already in use', 400);
    }
    
    // Set email as unverified and generate new verification token
    fieldsToUpdate.emailVerified = false;
    
    const user = await User.findById(req.user.id);
    const verificationToken = user.getEmailVerificationToken();
    
    // Update user with new details and verification token
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { ...fieldsToUpdate },
      { new: true, runValidators: true }
    );
    
    // Send verification email
    await sendVerificationEmail(updatedUser, verificationToken);
    
    res.status(200).json({
      success: true,
      data: updatedUser,
      message: 'User details updated. Please verify your new email address.'
    });
  } else {
    // Update user details without changing email verification status
    const user = await User.findByIdAndUpdate(
      req.user.id,
      fieldsToUpdate,
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      data: user,
      message: 'User details updated successfully'
    });
  }
});

/**
 * Update password
 * @route PUT /api/auth/updatepassword
 */
exports.updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  // Check if passwords are provided
  if (!currentPassword || !newPassword) {
    throw new ApiError('Please provide current and new password', 400);
  }
  
  // Get user with password
  const user = await User.findById(req.user.id).select('+password');
  
  // Check if current password matches
  const isMatch = await user.matchPassword(currentPassword);
  
  if (!isMatch) {
    throw new ApiError('Current password is incorrect', 401);
  }
  
  // Update password
  user.password = newPassword;
  await user.save();
  
  // Create and send new JWT token
  sendTokenResponse(user, 200, res, 'Password updated successfully');
});

/**
 * Forgot password
 * @route POST /api/auth/forgotpassword
 */
exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  
  // Find user by email
  const user = await User.findOne({ email });
  
  if (!user) {
    throw new ApiError('No user found with that email', 404);
  }
  
  // Generate reset token
  const resetToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });
  
  try {
    // Send password reset email
    await sendPasswordResetEmail(user, resetToken);
    
    res.status(200).json({
      success: true,
      message: 'Password reset email sent'
    });
  } catch (error) {
    // Reset token fields if email sending fails
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    
    logger.error('Password reset email failed:', error);
    throw new ApiError('Email could not be sent', 500);
  }
});

/**
 * Reset password
 * @route PUT /api/auth/resetpassword/:resettoken
 */
exports.resetPassword = asyncHandler(async (req, res) => {
  // Get hashed token
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.resettoken)
    .digest('hex');
  
  // Find user by reset token and check if token is still valid
  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() }
  });
  
  if (!user) {
    throw new ApiError('Invalid or expired token', 400);
  }
  
  // Set new password
  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();
  
  // Create and send new JWT token
  sendTokenResponse(user, 200, res, 'Password reset successful');
});

/**
 * Verify email
 * @route GET /api/auth/verifyemail/:verificationtoken
 */
exports.verifyEmail = asyncHandler(async (req, res) => {
  // Get hashed token
  const emailVerificationToken = crypto
    .createHash('sha256')
    .update(req.params.verificationtoken)
    .digest('hex');
  
  // Find user by verification token and check if token is still valid
  const user = await User.findOne({
    emailVerificationToken,
    emailVerificationExpire: { $gt: Date.now() }
  });
  
  if (!user) {
    throw new ApiError('Invalid or expired token', 400);
  }
  
  // Set email as verified
  user.emailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpire = undefined;
  await user.save();
  
  res.status(200).json({
    success: true,
    message: 'Email verified successfully'
  });
});

/**
 * Google OAuth login/register
 * @route GET /api/auth/google/callback
 */
exports.googleCallback = asyncHandler(async (req, res) => {
  // This would be handled by Passport.js in a complete implementation
  // For now, we'll simulate the process
  
  // Example Google profile data
  const googleProfile = req.user;
  
  // Find user by Google ID or email
  let user = await User.findOne({
    $or: [
      { googleId: googleProfile.id },
      { email: googleProfile.email }
    ]
  });
  
  if (!user) {
    // Create new user if not found
    user = await User.create({
      name: googleProfile.displayName,
      email: googleProfile.email,
      googleId: googleProfile.id,
      emailVerified: true, // Google accounts have verified emails
      password: crypto.randomBytes(20).toString('hex') // Random password for Google users
    });
    
    // Send welcome email
    await sendWelcomeEmail(user);
  } else if (!user.googleId) {
    // If user exists but doesn't have Google ID, link accounts
    user.googleId = googleProfile.id;
    await user.save({ validateBeforeSave: false });
  }
  
  // Update last login timestamp
  user.lastLogin = Date.now();
  await user.save({ validateBeforeSave: false });
  
  // Create and send JWT token
  sendTokenResponse(user, 200, res, 'Google authentication successful');
});

/**
 * Helper function to create and send JWT token response
 */
const sendTokenResponse = (user, statusCode, res, message) => {
  // Create token
  const token = user.getSignedJwtToken();
  
  // Remove sensitive fields
  user.password = undefined;
  
  res.status(statusCode).json({
    success: true,
    message,
    token,
    user
  });
};
