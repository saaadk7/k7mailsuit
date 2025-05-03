/**
 * Validation Middleware
 * 
 * Uses Joi to validate request data against schemas
 */

const Joi = require('joi');
const { ApiError } = require('./error.middleware');

/**
 * Validate request data against a Joi schema
 * @param {Object} schema - Joi schema for validation
 * @param {String} property - Request property to validate (body, params, query)
 */
exports.validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const data = req[property];
    const { error } = schema.validate(data, { abortEarly: false });
    
    if (!error) {
      return next();
    }
    
    const errorMessages = error.details.map(detail => detail.message).join(', ');
    return next(new ApiError(errorMessages, 400));
  };
};

/**
 * Common validation schemas
 */
exports.schemas = {
  // User schemas
  userRegister: Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required()
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$'))
      .message('Password must contain at least 8 characters, including uppercase, lowercase, and numbers'),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required()
      .messages({ 'any.only': 'Passwords do not match' })
  }),
  
  userLogin: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),
  
  // Email tracking schemas
  trackEmail: Joi.object({
    recipient: Joi.string().email().required(),
    subject: Joi.string().required(),
    body: Joi.string().allow(''),
    trackOpens: Joi.boolean().default(true),
    trackLinks: Joi.boolean().default(true)
  }),
  
  // Template schemas
  emailTemplate: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    subject: Joi.string().required(),
    body: Joi.string().required(),
    tags: Joi.array().items(Joi.string()).default([])
  }),
  
  // Campaign schemas
  campaign: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    templateId: Joi.string().required(),
    recipients: Joi.array().items(Joi.object({
      email: Joi.string().email().required(),
      name: Joi.string().allow(''),
      variables: Joi.object().pattern(
        Joi.string(), 
        Joi.alternatives().try(Joi.string(), Joi.number(), Joi.boolean())
      )
    })).min(1).required(),
    scheduledAt: Joi.date().iso().allow(null),
    status: Joi.string().valid('draft', 'scheduled', 'sending', 'sent', 'cancelled').default('draft')
  }),
  
  // Analytics filters
  analyticsFilter: Joi.object({
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().greater(Joi.ref('startDate')),
    emailId: Joi.string(),
    campaignId: Joi.string(),
    recipient: Joi.string().email()
  }).min(1)
};
