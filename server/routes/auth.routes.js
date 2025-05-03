/**
 * Authentication Routes
 */

const express = require('express');
const { validate, schemas } = require('../middleware/validation.middleware');
const { authMiddleware } = require('../middleware/auth.middleware');
const {
  register,
  login,
  logout,
  getMe,
  updateDetails,
  updatePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  googleCallback
} = require('../controllers/auth.controller');

const router = express.Router();

// Public routes
router.post('/register', validate(schemas.userRegister), register);
router.post('/login', validate(schemas.userLogin), login);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);
router.get('/verifyemail/:verificationtoken', verifyEmail);
router.get('/google/callback', googleCallback);

// Protected routes
router.use(authMiddleware); // Apply auth middleware to all routes below
router.get('/me', getMe);
router.get('/logout', logout);
router.put('/updatedetails', updateDetails);
router.put('/updatepassword', updatePassword);

module.exports = router;
