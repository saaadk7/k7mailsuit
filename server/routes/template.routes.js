/**
 * Template Routes
 */

const express = require('express');
const { validate, schemas } = require('../middleware/validation.middleware');
const { authMiddleware } = require('../middleware/auth.middleware');
const {
  createTemplate,
  getTemplates,
  getTemplate,
  updateTemplate,
  deleteTemplate,
  getCategories,
  getTags,
  duplicateTemplate
} = require('../controllers/template.controller');

const router = express.Router();

// All template routes are protected
router.use(authMiddleware);

// Template categories and tags routes
router.get('/categories', getCategories);
router.get('/tags', getTags);

// Template CRUD routes
router.post('/', validate(schemas.emailTemplate), createTemplate);
router.get('/', getTemplates);
router.get('/:id', getTemplate);
router.put('/:id', updateTemplate);
router.delete('/:id', deleteTemplate);

// Template duplication
router.post('/:id/duplicate', duplicateTemplate);

module.exports = router;
