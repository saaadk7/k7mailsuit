/**
 * Template Model
 * 
 * Defines the schema for email templates in MongoDB
 */

const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Template name is required'],
    trim: true,
    maxlength: [100, 'Template name cannot be more than 100 characters']
  },
  subject: {
    type: String,
    required: [true, 'Email subject is required'],
    trim: true
  },
  body: {
    type: String,
    required: [true, 'Email body is required']
  },
  category: {
    type: String,
    enum: ['general', 'follow-up', 'sales', 'marketing', 'support', 'custom'],
    default: 'general'
  },
  tags: [{
    type: String,
    trim: true
  }],
  isDefault: {
    type: Boolean,
    default: false
  },
  variables: [{
    name: String,
    defaultValue: String,
    description: String
  }],
  usageCount: {
    type: Number,
    default: 0
  },
  lastUsed: Date,
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for faster queries
templateSchema.index({ userId: 1, name: 1 }, { unique: true });
templateSchema.index({ userId: 1, category: 1 });
templateSchema.index({ userId: 1, tags: 1 });

// Pre-save middleware to extract variables from template
templateSchema.pre('save', function(next) {
  if (this.isModified('body')) {
    // Extract variables from template body using regex
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const matches = this.body.match(variableRegex) || [];
    
    // Create a set of unique variable names
    const variableNames = new Set();
    matches.forEach(match => {
      const name = match.replace(/\{\{|\}\}/g, '').trim();
      variableNames.add(name);
    });
    
    // Create or update variables array
    const existingVars = this.variables || [];
    const existingVarNames = new Set(existingVars.map(v => v.name));
    
    // Add new variables that don't exist yet
    const newVariables = [];
    variableNames.forEach(name => {
      if (!existingVarNames.has(name)) {
        newVariables.push({
          name,
          defaultValue: '',
          description: `Variable for ${name}`
        });
      }
    });
    
    // Keep existing variables that are still in the template
    const updatedVariables = existingVars.filter(v => variableNames.has(v.name));
    
    // Add new variables
    this.variables = [...updatedVariables, ...newVariables];
  }
  
  next();
});

// Method to increment usage count
templateSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  this.lastUsed = Date.now();
  return this.save();
};

// Static method to find templates by tag
templateSchema.statics.findByTag = function(userId, tag) {
  return this.find({
    userId,
    tags: tag,
    active: true
  }).sort({ name: 1 });
};

// Static method to find default templates
templateSchema.statics.findDefaults = function(userId) {
  return this.find({
    userId,
    isDefault: true,
    active: true
  }).sort({ category: 1, name: 1 });
};

module.exports = mongoose.model('Template', templateSchema);
