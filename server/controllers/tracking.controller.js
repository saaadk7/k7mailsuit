/**
 * Tracking Controller
 * 
 * Handles email tracking events (opens, clicks) and analytics
 */

const Tracking = require('../models/tracking.model');
const User = require('../models/user.model');
const { asyncHandler } = require('../middleware/error.middleware');
const { ApiError } = require('../middleware/error.middleware');
const { createLogger } = require('../utils/logger');
const { extractTrackingInfo, parseTrackingParams, generateTransparentPixel } = require('../utils/tracking');

const logger = createLogger('tracking-controller');

/**
 * Track email open event
 * @route GET /api/track/open
 * @access Public
 */
exports.trackOpen = asyncHandler(async (req, res) => {
  try {
    // Parse tracking parameters
    const { trackingId } = parseTrackingParams(req.query);
    
    // Extract tracking information from request
    const trackingInfo = extractTrackingInfo(req);
    
    // Find tracking record
    const trackingRecord = await Tracking.findOne({ emailId: trackingId });
    
    if (trackingRecord) {
      // Add open event to tracking record
      await trackingRecord.addOpen({
        timestamp: trackingInfo.timestamp,
        ip: trackingInfo.ip,
        userAgent: trackingInfo.userAgent,
        location: '' // Would be populated by a geolocation service in production
      });
      
      logger.info(`Email opened: ${trackingId}`, { 
        recipient: trackingRecord.recipient,
        deviceType: trackingInfo.deviceType 
      });
      
      // Emit real-time event via Socket.io if user is connected
      const io = req.app.get('io');
      if (io) {
        io.to(`user-${trackingRecord.userId}`).emit('email-opened', {
          trackingId,
          recipient: trackingRecord.recipient,
          subject: trackingRecord.subject,
          timestamp: trackingInfo.timestamp
        });
      }
    } else {
      logger.warn(`Tracking record not found for ID: ${trackingId}`);
    }
    
    // Return a transparent 1x1 pixel GIF
    const pixelBuffer = generateTransparentPixel();
    res.set('Content-Type', 'image/gif');
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    return res.send(pixelBuffer);
  } catch (error) {
    logger.error('Error tracking email open:', error);
    
    // Still return a pixel to avoid breaking the email display
    const pixelBuffer = generateTransparentPixel();
    res.set('Content-Type', 'image/gif');
    return res.send(pixelBuffer);
  }
});

/**
 * Track link click event
 * @route GET /api/track/click
 * @access Public
 */
exports.trackClick = asyncHandler(async (req, res) => {
  try {
    // Parse tracking parameters
    const { trackingId, originalUrl, linkIndex } = parseTrackingParams(req.query);
    
    if (!originalUrl) {
      throw new ApiError('Missing original URL', 400);
    }
    
    // Extract tracking information from request
    const trackingInfo = extractTrackingInfo(req);
    
    // Find tracking record
    const trackingRecord = await Tracking.findOne({ emailId: trackingId });
    
    if (trackingRecord) {
      // Add click event to tracking record
      await trackingRecord.addClick({
        timestamp: trackingInfo.timestamp,
        linkUrl: originalUrl,
        linkIndex: linkIndex || 0,
        ip: trackingInfo.ip,
        userAgent: trackingInfo.userAgent,
        location: '' // Would be populated by a geolocation service in production
      });
      
      logger.info(`Link clicked: ${trackingId}`, { 
        recipient: trackingRecord.recipient,
        url: originalUrl,
        deviceType: trackingInfo.deviceType 
      });
      
      // Emit real-time event via Socket.io if user is connected
      const io = req.app.get('io');
      if (io) {
        io.to(`user-${trackingRecord.userId}`).emit('link-clicked', {
          trackingId,
          recipient: trackingRecord.recipient,
          subject: trackingRecord.subject,
          url: originalUrl,
          timestamp: trackingInfo.timestamp
        });
      }
    } else {
      logger.warn(`Tracking record not found for ID: ${trackingId}`);
    }
    
    // Redirect to the original URL
    return res.redirect(originalUrl);
  } catch (error) {
    logger.error('Error tracking link click:', error);
    
    // Redirect to a default URL if there's an error
    return res.redirect(req.query.url || '/');
  }
});

/**
 * Create a new tracking record
 * @route POST /api/track/create
 * @access Private
 */
exports.createTracking = asyncHandler(async (req, res) => {
  const { emailId, recipient, subject, campaignId } = req.body;
  
  // Check if tracking record already exists
  const existingRecord = await Tracking.findOne({ emailId });
  if (existingRecord) {
    throw new ApiError('Tracking record already exists for this email', 400);
  }
  
  // Get user's data retention setting
  const user = await User.findById(req.user.id);
  const retentionDays = user.settings?.dataRetentionDays || 90;
  
  // Calculate expiration date
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + retentionDays);
  
  // Create tracking record
  const trackingRecord = await Tracking.create({
    userId: req.user.id,
    emailId,
    recipient,
    subject,
    campaignId: campaignId || null,
    sentAt: new Date(),
    expiresAt
  });
  
  res.status(201).json({
    success: true,
    data: trackingRecord,
    message: 'Tracking record created successfully'
  });
});

/**
 * Get tracking data for a specific email
 * @route GET /api/track/:emailId
 * @access Private
 */
exports.getTracking = asyncHandler(async (req, res) => {
  const trackingRecord = await Tracking.findOne({
    emailId: req.params.emailId,
    userId: req.user.id
  });
  
  if (!trackingRecord) {
    throw new ApiError('Tracking record not found', 404);
  }
  
  res.status(200).json({
    success: true,
    data: trackingRecord
  });
});

/**
 * Get all tracking data for the authenticated user
 * @route GET /api/track
 * @access Private
 */
exports.getAllTracking = asyncHandler(async (req, res) => {
  // Build query with filters
  const query = { userId: req.user.id };
  
  // Filter by recipient if provided
  if (req.query.recipient) {
    query.recipient = { $regex: req.query.recipient, $options: 'i' };
  }
  
  // Filter by campaign if provided
  if (req.query.campaignId) {
    query.campaignId = req.query.campaignId;
  }
  
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
  
  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const startIndex = (page - 1) * limit;
  
  // Execute query with pagination
  const total = await Tracking.countDocuments(query);
  const trackingRecords = await Tracking.find(query)
    .sort({ sentAt: -1 })
    .skip(startIndex)
    .limit(limit);
  
  // Pagination result
  const pagination = {
    total,
    pages: Math.ceil(total / limit),
    page,
    limit
  };
  
  res.status(200).json({
    success: true,
    count: trackingRecords.length,
    pagination,
    data: trackingRecords
  });
});

/**
 * Delete a tracking record
 * @route DELETE /api/track/:emailId
 * @access Private
 */
exports.deleteTracking = asyncHandler(async (req, res) => {
  const trackingRecord = await Tracking.findOne({
    emailId: req.params.emailId,
    userId: req.user.id
  });
  
  if (!trackingRecord) {
    throw new ApiError('Tracking record not found', 404);
  }
  
  await trackingRecord.remove();
  
  res.status(200).json({
    success: true,
    message: 'Tracking record deleted successfully'
  });
});

/**
 * Get real-time tracking updates
 * @route GET /api/track/updates
 * @access Private
 */
exports.getUpdates = asyncHandler(async (req, res) => {
  // Get timestamp from query or default to 1 hour ago
  const since = req.query.since 
    ? new Date(req.query.since) 
    : new Date(Date.now() - 60 * 60 * 1000);
  
  // Find recent opens
  const recentOpens = await Tracking.find({
    userId: req.user.id,
    'opens.timestamp': { $gte: since }
  }).select('emailId recipient subject opens');
  
  // Find recent clicks
  const recentClicks = await Tracking.find({
    userId: req.user.id,
    'clicks.timestamp': { $gte: since }
  }).select('emailId recipient subject clicks');
  
  // Process opens to get only the recent ones
  const opens = recentOpens.flatMap(record => {
    const recentOpenEvents = record.opens.filter(open => 
      new Date(open.timestamp) >= since
    );
    
    return recentOpenEvents.map(open => ({
      trackingId: record.emailId,
      recipient: record.recipient,
      subject: record.subject,
      timestamp: open.timestamp
    }));
  });
  
  // Process clicks to get only the recent ones
  const clicks = recentClicks.flatMap(record => {
    const recentClickEvents = record.clicks.filter(click => 
      new Date(click.timestamp) >= since
    );
    
    return recentClickEvents.map(click => ({
      trackingId: record.emailId,
      recipient: record.recipient,
      subject: record.subject,
      url: click.linkUrl,
      timestamp: click.timestamp
    }));
  });
  
  res.status(200).json({
    success: true,
    data: {
      opens,
      clicks,
      timestamp: new Date()
    }
  });
});
