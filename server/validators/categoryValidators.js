const { body, param } = require('express-validator');

// GET /api/categories/:id - id can be a MongoDB ObjectId or a slug.
const getCategoryRules = [
  param('id')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Category id must be between 1 and 100 characters'),
];

// /api/categories/:id used by the admin update/delete routes (ObjectId only).
const categoryIdRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid category id'),
];

// POST /api/categories (admin)
const createCategoryRules = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 60 })
    .withMessage('Category name must be between 2 and 60 characters'),

  body('description')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 300 })
    .withMessage('Description cannot exceed 300 characters'),
];

// PATCH /api/categories/:id (admin) - every field is optional.
const updateCategoryRules = [
  ...categoryIdRules,

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 60 })
    .withMessage('Category name must be between 2 and 60 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage('Description cannot exceed 300 characters'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be true or false'),
];

module.exports = { getCategoryRules, categoryIdRules, createCategoryRules, updateCategoryRules };
