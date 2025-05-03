/**
 * Tracking Model
 * 
 * Defines the schema for email tracking data in MongoDB
 */

const mongoose = require('mongoose');

const trackingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  emailId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    default: null
  },
  recipient: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  sentAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  opens: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    ip: String,
    userAgent: String,
    location: String
  }],
  clicks: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    linkUrl: String,
    linkIndex: Number,
    ip: String,
    userAgent: String,
    location: String
  }],
  replies: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    messageId: String
  }],
  status: {
    type: String,
    enum: ['sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced', 'failed'],
    default: 'sent'
  },
  trackingEnabled: {
    type: Boolean,
    default: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  expiresAt: {
    type: Date,
    default: function() {
      // Default expiration based on user settings or global default
      const defaultRetentionDays = 90;
      return new Date(Date.now() + defaultRetentionDays * 24 * 60 * 60 * 1000);
    }
  }
}, {
  timestamps: true
});

// Indexes for faster queries
trackingSchema.index({ userId: 1, sentAt: -1 });
trackingSchema.index({ recipient: 1, userId: 1 });
trackingSchema.index({ campaignId: 1 });
trackingSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for data retention

// Virtual for total opens count
trackingSchema.virtual('opensCount').get(function() {
  return this.opens.length;
});

// Virtual for total clicks count
trackingSchema.virtual('clicksCount').get(function() {
  return this.clicks.length;
});

// Virtual for last opened timestamp
trackingSchema.virtual('lastOpenedAt').get(function() {
  if (this.opens.length === 0) return null;
  return this.opens[this.opens.length - 1].timestamp;
});

// Virtual for last clicked timestamp
trackingSchema.virtual('lastClickedAt').get(function() {
  if (this.clicks.length === 0) return null;
  return this.clicks[this.clicks.length - 1].timestamp;
});

// Method to add an open event
trackingSchema.methods.addOpen = function(openData) {
  this.opens.push(openData);
  
  // Update status if this is the first open
  if (this.status === 'sent' || this.status === 'delivered') {
    this.status = 'opened';
  }
  
  return this.save();
};

// Method to add a click event
trackingSchema.methods.addClick = function(clickData) {
  this.clicks.push(clickData);
  
  // Update status
  this.status = 'clicked';
  
  return this.save();
};

// Method to add a reply event
trackingSchema.methods.addReply = function(replyData) {
  this.replies.push(replyData);
  
  // Update status
  this.status = 'replied';
  
  return this.save();
};

// Update expiration based on user settings
trackingSchema.methods.updateExpiration = function(retentionDays) {
  if (!retentionDays || retentionDays < 1) return this;
  
  this.expiresAt = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000);
  return this.save();
};

module.exports = mongoose.model('Tracking', trackingSchema);
