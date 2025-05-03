/**
 * Analytics Routes
 */

const express = require('express');
const { authMiddleware } = require('../middleware/auth.middleware');
const {
  getAnalyticsSummary,
  getActivityOverTime,
  getDeviceAnalytics,
  getGeographicAnalytics,
  getTopEmails
} = require('../controllers/analytics.controller');

const router = express.Router();

// All analytics routes are protected
router.use(authMiddleware);

router.get('/summary', getAnalyticsSummary);
router.get('/activity', getActivityOverTime);
router.get('/devices', getDeviceAnalytics);
router.get('/geography', getGeographicAnalytics);
router.get('/top-emails', getTopEmails);

module.exports = router;
