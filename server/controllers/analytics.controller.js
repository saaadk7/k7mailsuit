/**
 * Analytics Controller
 * 
 * Handles email analytics and reporting
 */

const Tracking = require('../models/tracking.model');
const { asyncHandler } = require('../middleware/error.middleware');
const { ApiError } = require('../middleware/error.middleware');
const { createLogger } = require('../utils/logger');

const logger = createLogger('analytics-controller');

/**
 * Get email analytics summary
 * @route GET /api/analytics/summary
 * @access Private
 */
exports.getAnalyticsSummary = asyncHandler(async (req, res) => {
  // Build query with filters
  const query = { userId: req.user.id };
  
  // Filter by date range if provided
  if (req.query.startDate || req.query.endDate) {
    query.sentAt = {};
    
    if (req.query.startDate) {
      query.sentAt.$gte = new Date(req.query.startDate);
    }
    
    if (req.query.endDate) {
      query.sentAt.$lte = new Date(req.query.endDate);
    }
  }
  
  // Get all tracking records for the user
  const trackingRecords = await Tracking.find(query);
  
  // Calculate summary statistics
  const totalEmails = trackingRecords.length;
  
  let totalOpens = 0;
  let totalClicks = 0;
  let openedEmails = 0;
  let clickedEmails = 0;
  
  trackingRecords.forEach(record => {
    const opensCount = record.opens.length;
    const clicksCount = record.clicks.length;
    
    totalOpens += opensCount;
    totalClicks += clicksCount;
    
    if (opensCount > 0) openedEmails++;
    if (clicksCount > 0) clickedEmails++;
  });
  
  // Calculate rates
  const openRate = totalEmails > 0 ? (openedEmails / totalEmails) * 100 : 0;
  const clickRate = openedEmails > 0 ? (clickedEmails / openedEmails) * 100 : 0;
  const clickToOpenRate = totalOpens > 0 ? (totalClicks / totalOpens) * 100 : 0;
  
  // Get top recipients by opens
  const recipientStats = {};
  trackingRecords.forEach(record => {
    const recipient = record.recipient;
    if (!recipientStats[recipient]) {
      recipientStats[recipient] = {
        emails: 0,
        opens: 0,
        clicks: 0
      };
    }
    
    recipientStats[recipient].emails++;
    recipientStats[recipient].opens += record.opens.length;
    recipientStats[recipient].clicks += record.clicks.length;
  });
  
  const topRecipients = Object.entries(recipientStats)
    .map(([recipient, stats]) => ({
      recipient,
      emails: stats.emails,
      opens: stats.opens,
      clicks: stats.clicks,
      openRate: stats.emails > 0 ? (stats.opens / stats.emails) * 100 : 0
    }))
    .sort((a, b) => b.opens - a.opens)
    .slice(0, 5);
  
  res.status(200).json({
    success: true,
    data: {
      totalEmails,
      totalOpens,
      totalClicks,
      openedEmails,
      clickedEmails,
      openRate: openRate.toFixed(2),
      clickRate: clickRate.toFixed(2),
      clickToOpenRate: clickToOpenRate.toFixed(2),
      topRecipients
    }
  });
});

/**
 * Get email activity over time
 * @route GET /api/analytics/activity
 * @access Private
 */
exports.getActivityOverTime = asyncHandler(async (req, res) => {
  // Get time period from query (default to 'week')
  const period = req.query.period || 'week';
  
  // Determine date range based on period
  const endDate = new Date();
  let startDate = new Date();
  let interval;
  let format;
  
  switch (period) {
    case 'day':
      startDate.setDate(endDate.getDate() - 1);
      interval = 'hour';
      format = 'HH:00';
      break;
    case 'week':
      startDate.setDate(endDate.getDate() - 7);
      interval = 'day';
      format = 'YYYY-MM-DD';
      break;
    case 'month':
      startDate.setMonth(endDate.getMonth() - 1);
      interval = 'day';
      format = 'YYYY-MM-DD';
      break;
    case 'year':
      startDate.setFullYear(endDate.getFullYear() - 1);
      interval = 'month';
      format = 'YYYY-MM';
      break;
    default:
      startDate.setDate(endDate.getDate() - 7);
      interval = 'day';
      format = 'YYYY-MM-DD';
  }
  
  // Get tracking records within date range
  const trackingRecords = await Tracking.find({
    userId: req.user.id,
    sentAt: { $gte: startDate, $lte: endDate }
  });
  
  // Initialize activity data
  const activityData = {
    labels: [],
    sent: [],
    opens: [],
    clicks: []
  };
  
  // Generate time intervals
  const intervals = generateTimeIntervals(startDate, endDate, interval);
  activityData.labels = intervals.map(date => formatDate(date, format));
  
  // Initialize counts for each interval
  const sentCounts = new Array(intervals.length).fill(0);
  const openCounts = new Array(intervals.length).fill(0);
  const clickCounts = new Array(intervals.length).fill(0);
  
  // Count emails sent in each interval
  trackingRecords.forEach(record => {
    const sentDate = new Date(record.sentAt);
    const intervalIndex = findIntervalIndex(sentDate, intervals, interval);
    
    if (intervalIndex !== -1) {
      sentCounts[intervalIndex]++;
      
      // Count opens in each interval
      record.opens.forEach(open => {
        const openDate = new Date(open.timestamp);
        const openIntervalIndex = findIntervalIndex(openDate, intervals, interval);
        
        if (openIntervalIndex !== -1) {
          openCounts[openIntervalIndex]++;
        }
      });
      
      // Count clicks in each interval
      record.clicks.forEach(click => {
        const clickDate = new Date(click.timestamp);
        const clickIntervalIndex = findIntervalIndex(clickDate, intervals, interval);
        
        if (clickIntervalIndex !== -1) {
          clickCounts[clickIntervalIndex]++;
        }
      });
    }
  });
  
  activityData.sent = sentCounts;
  activityData.opens = openCounts;
  activityData.clicks = clickCounts;
  
  res.status(200).json({
    success: true,
    data: activityData
  });
});

/**
 * Get device and platform analytics
 * @route GET /api/analytics/devices
 * @access Private
 */
exports.getDeviceAnalytics = asyncHandler(async (req, res) => {
  // Get tracking records for the user
  const trackingRecords = await Tracking.find({ userId: req.user.id });
  
  // Initialize device and platform counters
  const devices = {
    desktop: 0,
    mobile: 0,
    tablet: 0,
    other: 0
  };
  
  const platforms = {
    windows: 0,
    mac: 0,
    ios: 0,
    android: 0,
    linux: 0,
    other: 0
  };
  
  const browsers = {
    chrome: 0,
    firefox: 0,
    safari: 0,
    edge: 0,
    ie: 0,
    other: 0
  };
  
  // Process all open events
  trackingRecords.forEach(record => {
    record.opens.forEach(open => {
      // Simple user agent parsing (in production, use a proper UA parser library)
      const ua = open.userAgent.toLowerCase();
      
      // Detect device type
      if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
        devices.mobile++;
      } else if (ua.includes('ipad') || ua.includes('tablet')) {
        devices.tablet++;
      } else if (ua.includes('mozilla') || ua.includes('chrome') || ua.includes('safari')) {
        devices.desktop++;
      } else {
        devices.other++;
      }
      
      // Detect platform
      if (ua.includes('windows')) {
        platforms.windows++;
      } else if (ua.includes('macintosh') || ua.includes('mac os')) {
        platforms.mac++;
      } else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ios')) {
        platforms.ios++;
      } else if (ua.includes('android')) {
        platforms.android++;
      } else if (ua.includes('linux')) {
        platforms.linux++;
      } else {
        platforms.other++;
      }
      
      // Detect browser
      if (ua.includes('chrome') && !ua.includes('edg')) {
        browsers.chrome++;
      } else if (ua.includes('firefox')) {
        browsers.firefox++;
      } else if (ua.includes('safari') && !ua.includes('chrome')) {
        browsers.safari++;
      } else if (ua.includes('edg')) {
        browsers.edge++;
      } else if (ua.includes('trident') || ua.includes('msie')) {
        browsers.ie++;
      } else {
        browsers.other++;
      }
    });
  });
  
  res.status(200).json({
    success: true,
    data: {
      devices,
      platforms,
      browsers
    }
  });
});

/**
 * Get geographic distribution of opens
 * @route GET /api/analytics/geography
 * @access Private
 */
exports.getGeographicAnalytics = asyncHandler(async (req, res) => {
  // In a real implementation, this would use geolocation data from the tracking records
  // For this example, we'll return mock data
  
  res.status(200).json({
    success: true,
    data: {
      countries: [
        { country: 'United States', count: 45 },
        { country: 'United Kingdom', count: 15 },
        { country: 'Canada', count: 12 },
        { country: 'Australia', count: 8 },
        { country: 'Germany', count: 7 },
        { country: 'France', count: 5 },
        { country: 'Other', count: 10 }
      ],
      cities: [
        { city: 'New York', country: 'United States', count: 12 },
        { city: 'London', country: 'United Kingdom', count: 10 },
        { city: 'San Francisco', country: 'United States', count: 8 },
        { city: 'Toronto', country: 'Canada', count: 7 },
        { city: 'Sydney', country: 'Australia', count: 5 }
      ]
    }
  });
});

/**
 * Get top performing emails
 * @route GET /api/analytics/top-emails
 * @access Private
 */
exports.getTopEmails = asyncHandler(async (req, res) => {
  // Get tracking records for the user
  const trackingRecords = await Tracking.find({ userId: req.user.id });
  
  // Calculate performance metrics for each email
  const emailPerformance = trackingRecords.map(record => {
    const opensCount = record.opens.length;
    const clicksCount = record.clicks.length;
    const openRate = opensCount > 0 ? 1 : 0; // Binary for this record
    const clickRate = clicksCount > 0 ? 1 : 0; // Binary for this record
    
    return {
      emailId: record.emailId,
      subject: record.subject,
      recipient: record.recipient,
      sentAt: record.sentAt,
      opensCount,
      clicksCount,
      openRate,
      clickRate,
      performance: (openRate * 0.6) + (clickRate * 0.4) // Weighted score
    };
  });
  
  // Sort by performance score
  const topEmails = emailPerformance
    .sort((a, b) => b.performance - a.performance)
    .slice(0, 10);
  
  res.status(200).json({
    success: true,
    data: topEmails
  });
});

// Helper functions

/**
 * Generate time intervals between start and end dates
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {string} interval - Interval type ('hour', 'day', 'month')
 * @returns {Array} - Array of date objects representing intervals
 */
function generateTimeIntervals(startDate, endDate, interval) {
  const intervals = [];
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    intervals.push(new Date(currentDate));
    
    switch (interval) {
      case 'hour':
        currentDate.setHours(currentDate.getHours() + 1);
        break;
      case 'day':
        currentDate.setDate(currentDate.getDate() + 1);
        break;
      case 'month':
        currentDate.setMonth(currentDate.getMonth() + 1);
        break;
      default:
        currentDate.setDate(currentDate.getDate() + 1);
    }
  }
  
  return intervals;
}

/**
 * Find the index of the interval that a date falls into
 * @param {Date} date - Date to find interval for
 * @param {Array} intervals - Array of interval dates
 * @param {string} intervalType - Type of interval ('hour', 'day', 'month')
 * @returns {number} - Index of the interval, or -1 if not found
 */
function findIntervalIndex(date, intervals, intervalType) {
  for (let i = 0; i < intervals.length; i++) {
    const interval = intervals[i];
    const nextInterval = i < intervals.length - 1 ? intervals[i + 1] : new Date(interval);
    
    // Adjust next interval based on interval type
    switch (intervalType) {
      case 'hour':
        nextInterval.setHours(nextInterval.getHours() + 1);
        break;
      case 'day':
        nextInterval.setDate(nextInterval.getDate() + 1);
        break;
      case 'month':
        nextInterval.setMonth(nextInterval.getMonth() + 1);
        break;
      default:
        nextInterval.setDate(nextInterval.getDate() + 1);
    }
    
    if (date >= interval && date < nextInterval) {
      return i;
    }
  }
  
  return -1;
}

/**
 * Format a date according to the specified format
 * @param {Date} date - Date to format
 * @param {string} format - Format string
 * @returns {string} - Formatted date string
 */
function formatDate(date, format) {
  // Simple date formatter (in production, use a library like moment.js or date-fns)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  
  switch (format) {
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'YYYY-MM':
      return `${year}-${month}`;
    case 'HH:00':
      return `${hours}:00`;
    default:
      return `${year}-${month}-${day}`;
  }
}
