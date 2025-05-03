/**
 * Tracking Utility
 * 
 * Provides functions for email tracking and analytics
 */

const crypto = require('crypto');
const { createLogger } = require('./logger');

const logger = createLogger('tracking-service');

/**
 * Generate a unique tracking ID
 * @param {string} userId - User ID
 * @param {string} [prefix=''] - Optional prefix for the tracking ID
 * @returns {string} - Unique tracking ID
 */
exports.generateTrackingId = (userId, prefix = '') => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  const hash = crypto.createHash('md5')
    .update(`${userId}-${timestamp}-${random}`)
    .digest('hex')
    .substring(0, 10);
  
  return `${prefix}${timestamp}${hash}`;
};

/**
 * Create a tracking pixel HTML for email open tracking
 * @param {string} trackingId - Unique tracking ID for the email
 * @param {string} [trackingDomain=process.env.TRACKING_DOMAIN] - Domain for tracking
 * @returns {string} - HTML for tracking pixel
 */
exports.createTrackingPixel = (trackingId, trackingDomain = process.env.TRACKING_DOMAIN) => {
  const trackingUrl = `${trackingDomain}/api/track/open?id=${trackingId}`;
  return `<img src="${trackingUrl}" width="1" height="1" alt="" style="display:none">`;
};

/**
 * Process HTML content to make links trackable
 * @param {string} html - Original HTML content
 * @param {string} trackingId - Unique tracking ID for the email
 * @param {string} [trackingDomain=process.env.TRACKING_DOMAIN] - Domain for tracking
 * @returns {string} - HTML with trackable links
 */
exports.processLinksForTracking = (html, trackingId, trackingDomain = process.env.TRACKING_DOMAIN) => {
  // Simple regex to find links in HTML
  // Note: In a production environment, use a proper HTML parser like cheerio
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  
  let linkIndex = 0;
  const processedHtml = html.replace(linkRegex, (match, url, text) => {
    // Skip tracking for certain links
    if (url.startsWith('#') || 
        url.startsWith('mailto:') || 
        url.startsWith('tel:') ||
        url.includes('/unsubscribe') ||
        url.includes('/api/track/')) {
      return match;
    }
    
    // Create tracking URL
    const trackingUrl = `${trackingDomain}/api/track/click?id=${trackingId}&url=${encodeURIComponent(url)}&idx=${linkIndex++}`;
    
    // Replace the original URL with the tracking URL
    return match.replace(url, trackingUrl);
  });
  
  return processedHtml;
};

/**
 * Extract tracking information from request
 * @param {object} req - Express request object
 * @returns {object} - Tracking information
 */
exports.extractTrackingInfo = (req) => {
  const userAgent = req.headers['user-agent'] || '';
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const referer = req.headers['referer'] || '';
  
  // Parse user agent to get device, browser, OS info
  // In a production app, use a proper user-agent parser library
  const isMobile = /mobile|android|iphone|ipad|ipod/i.test(userAgent);
  const isTablet = /tablet|ipad/i.test(userAgent);
  const deviceType = isTablet ? 'tablet' : (isMobile ? 'mobile' : 'desktop');
  
  return {
    ip,
    userAgent,
    referer,
    deviceType,
    timestamp: new Date()
  };
};

/**
 * Parse tracking parameters from query string
 * @param {object} query - Express request query object
 * @returns {object} - Parsed tracking parameters
 */
exports.parseTrackingParams = (query) => {
  const { id, url, idx } = query;
  
  if (!id) {
    throw new Error('Missing tracking ID');
  }
  
  return {
    trackingId: id,
    originalUrl: url ? decodeURIComponent(url) : null,
    linkIndex: idx ? parseInt(idx, 10) : null
  };
};

/**
 * Generate a transparent 1x1 pixel GIF
 * @returns {Buffer} - GIF image buffer
 */
exports.generateTransparentPixel = () => {
  // 1x1 transparent GIF
  const transparentPixelBuffer = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
  );
  
  return transparentPixelBuffer;
};
