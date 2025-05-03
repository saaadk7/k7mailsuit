/**
 * Tracking Routes
 */

const express = require('express');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth.middleware');
const {
  trackOpen,
  trackClick,
  createTracking,
  getTracking,
  getAllTracking,
  deleteTracking,
  getUpdates
} = require('../controllers/tracking.controller');

const router = express.Router();

// Public tracking routes (no auth required)
router.get('/open', trackOpen);
router.get('/click', trackClick);

// Protected routes
router.use(authMiddleware); // Apply auth middleware to all routes below
router.post('/create', createTracking);
router.get('/updates', getUpdates);
router.get('/:emailId', getTracking);
router.delete('/:emailId', deleteTracking);
router.get('/', getAllTracking);

module.exports = router;
