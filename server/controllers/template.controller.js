/**
 * Template Controller
 * 
 * Handles email template management
 */

const Template = require('../models/template.model');
const { asyncHandler } = require('../middleware/error.middleware');
const { ApiError } = require('../middleware/error.middleware');
const { createLogger } = require('../utils/logger');

const logger = createLogger('template-controller');

/**
 * Create a new email template
 * @route POST /api/templates
 * @access Private
 */
exports.createTemplate = asyncHandler(async (req, res) => {
  // Add user ID to template data
  req.body.userId = req.user.id;
  
  // Check if template with same name already exists for this user
  const existingTemplate = await Template.findOne({
    userId: req.user.id,
    name: req.body.name
  });
  
  if (existingTemplate) {
    throw new ApiError('Template with this name already exists', 400);
  }
  
  // Create template
  const template = await Template.create(req.body);
  
  res.status(201).json({
    success: true,
    data: template,
    message: 'Template created successfully'
  });
});

/**
 * Get all templates for the authenticated user
 * @route GET /api/templates
 * @access Private
 */
exports.getTemplates = asyncHandler(async (req, res) => {
  // Build query with filters
  const query = { userId: req.user.id };
  
  // Filter by category if provided
  if (req.query.category) {
    query.category = req.query.category;
  }
  
  // Filter by tag if provided
  if (req.query.tag) {
    query.tags = req.query.tag;
  }
  
  // Filter by active status if provided
  if (req.query.active !== undefined) {
    query.active = req.query.active === 'true';
  }
  
  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const startIndex = (page - 1) * limit;
  
  // Execute query with pagination
  const total = await Template.countDocuments(query);
  const templates = await Template.find(query)
    .sort({ updatedAt: -1 })
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
    count: templates.length,
    pagination,
    data: templates
  });
});

/**
 * Get a single template by ID
 * @route GET /api/templates/:id
 * @access Private
 */
exports.getTemplate = asyncHandler(async (req, res) => {
  const template = await Template.findOne({
    _id: req.params.id,
    userId: req.user.id
  });
  
  if (!template) {
    throw new ApiError('Template not found', 404);
  }
  
  res.status(200).json({
    success: true,
    data: template
  });
});

/**
 * Update a template
 * @route PUT /api/templates/:id
 * @access Private
 */
exports.updateTemplate = asyncHandler(async (req, res) => {
  let template = await Template.findOne({
    _id: req.params.id,
    userId: req.user.id
  });
  
  if (!template) {
    throw new ApiError('Template not found', 404);
  }
  
  // Check if name is being changed and if it already exists
  if (req.body.name && req.body.name !== template.name) {
    const existingTemplate = await Template.findOne({
      userId: req.user.id,
      name: req.body.name,
      _id: { $ne: req.params.id }
    });
    
    if (existingTemplate) {
      throw new ApiError('Template with this name already exists', 400);
    }
  }
  
  // Update template
  template = await Template.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );
  
  res.status(200).json({
    success: true,
    data: template,
    message: 'Template updated successfully'
  });
});

/**
 * Delete a template
 * @route DELETE /api/templates/:id
 * @access Private
 */
exports.deleteTemplate = asyncHandler(async (req, res) => {
  const template = await Template.findOne({
    _id: req.params.id,
    userId: req.user.id
  });
  
  if (!template) {
    throw new ApiError('Template not found', 404);
  }
  
  await template.remove();
  
  res.status(200).json({
    success: true,
    message: 'Template deleted successfully'
  });
});

/**
 * Get template categories
 * @route GET /api/templates/categories
 * @access Private
 */
exports.getCategories = asyncHandler(async (req, res) => {
  // Get all unique categories used by this user
  const categories = await Template.distinct('category', { userId: req.user.id });
  
  // Count templates in each category
  const categoryCounts = await Promise.all(
    categories.map(async (category) => {
      const count = await Template.countDocuments({
        userId: req.user.id,
        category
      });
      
      return {
        name: category,
        count
      };
    })
  );
  
  res.status(200).json({
    success: true,
    data: categoryCounts
  });
});

/**
 * Get template tags
 * @route GET /api/templates/tags
 * @access Private
 */
exports.getTags = asyncHandler(async (req, res) => {
  // Get all templates for this user
  const templates = await Template.find({ userId: req.user.id });
  
  // Extract all tags
  const allTags = templates.reduce((tags, template) => {
    return [...tags, ...template.tags];
  }, []);
  
  // Count occurrences of each tag
  const tagCounts = allTags.reduce((counts, tag) => {
    counts[tag] = (counts[tag] || 0) + 1;
    return counts;
  }, {});
  
  // Convert to array of objects
  const tags = Object.entries(tagCounts).map(([name, count]) => ({
    name,
    count
  }));
  
  // Sort by count (descending)
  tags.sort((a, b) => b.count - a.count);
  
  res.status(200).json({
    success: true,
    data: tags
  });
});

/**
 * Duplicate a template
 * @route POST /api/templates/:id/duplicate
 * @access Private
 */
exports.duplicateTemplate = asyncHandler(async (req, res) => {
  const template = await Template.findOne({
    _id: req.params.id,
    userId: req.user.id
  });
  
  if (!template) {
    throw new ApiError('Template not found', 404);
  }
  
  // Create a new name for the duplicate
  let newName = `${template.name} (Copy)`;
  let nameCounter = 1;
  
  // Check if the new name already exists
  let existingTemplate = await Template.findOne({
    userId: req.user.id,
    name: newName
  });
  
  // If name exists, append a number until we find a unique name
  while (existingTemplate) {
    nameCounter++;
    newName = `${template.name} (Copy ${nameCounter})`;
    
    existingTemplate = await Template.findOne({
      userId: req.user.id,
      name: newName
    });
  }
  
  // Create duplicate template
  const duplicateTemplate = await Template.create({
    userId: req.user.id,
    name: newName,
    subject: template.subject,
    body: template.body,
    category: template.category,
    tags: template.tags,
    variables: template.variables,
    isDefault: false, // Duplicates are never default
    active: true
  });
  
  res.status(201).json({
    success: true,
    data: duplicateTemplate,
    message: 'Template duplicated successfully'
  });
});
