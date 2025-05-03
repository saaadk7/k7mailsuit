/**
 * User Routes
 */

const express = require('express');
const { authMiddleware, authorizeRoles } = require('../middleware/auth.middleware');
const {
  getUserProfile,
  updateUserProfile,
  updateUserSettings,
  getUserSettings,
  deleteAccount
} = require('../controllers/user.controller');

const router = express.Router();

// All user routes are protected
router.use(authMiddleware);

// User profile routes
router.get('/profile', getUserProfile);
router.put('/profile', updateUserProfile);

// User settings routes
router.get('/settings', getUserSettings);
router.put('/settings', updateUserSettings);

// Account deletion
router.delete('/account', deleteAccount);

module.exports = router;
